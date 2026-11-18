import { withSupabase } from 'npm:@supabase/server'

const SHOPEE_DEFAULT_API_URL = 'https://open-api.affiliate.shopee.com.br/graphql'
const LIST_FEEDS_QUERY = `query ListItemFeeds($feedMode: FeedMode) {
  listItemFeeds(feedMode: $feedMode) {
    feeds {
      datafeedId
      referenceId
      datafeedName
      description
      totalCount
      date
      feedMode
    }
  }
}`
const GET_FEED_DATA_QUERY = `query GetItemFeedData(
  $datafeedId: String!,
  $offset: Int,
  $limit: Int
) {
  getItemFeedData(
    datafeedId: $datafeedId,
    offset: $offset,
    limit: $limit
  ) {
    rows {
      columns
      updateType
    }
    pageInfo {
      offset
      limit
      totalCount
      hasMore
    }
  }
}`

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return Response.json(
    { ...payload, persisted: false, published: false },
    { status },
  )
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return toHex(new Uint8Array(digest))
}

function normalizeGraphQLErrors(errors: unknown[]): Array<{ code: string | number | null; message: string }> {
  return errors.map((entry) => {
    const error = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    const extensions = error.extensions && typeof error.extensions === 'object'
      ? error.extensions as Record<string, unknown>
      : {}
    const code = error.code ?? extensions.code ?? extensions.errorCode ?? null
    return {
      code: typeof code === 'string' || typeof code === 'number' ? code : null,
      message: typeof error.message === 'string' ? error.message : 'Shopee GraphQL error',
    }
  })
}

async function signedShopeeRequest(
  endpoint: string,
  appId: string,
  secret: string,
  query: string,
  operationName: string,
  variables: Record<string, unknown>,
): Promise<{ response: Response; body: unknown }> {
  const payload = JSON.stringify({ query, operationName, variables })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = await sha256Hex(`${appId}${timestamp}${payload}${secret}`)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`,
    },
    body: payload,
  })

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { response, body }
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    const authorization = req.headers.get('Authorization')
    const match = authorization?.match(/^Bearer\s+(.+)$/i)
    const token = match?.[1]
    if (!token) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const { data: { user }, error: authError } = await ctx.supabase.auth.getUser(token)
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const { data: adminRecord, error: lookupError } = await ctx.supabaseAdmin
      .from('cr_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (lookupError) {
      console.error('Admin authorization lookup failed')
      return jsonResponse({ error: 'Authorization check failed' }, 500)
    }
    if (!adminRecord) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    let input: Record<string, unknown>
    try {
      const parsed = await req.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return jsonResponse({ error: 'Request body must be a JSON object' }, 400)
      }
      input = parsed as Record<string, unknown>
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const appId = Deno.env.get('SHOPEE_AFFILIATE_APP_ID')
    const secret = Deno.env.get('SHOPEE_AFFILIATE_SECRET')
    const configuredApiUrl = Deno.env.get('SHOPEE_AFFILIATE_API_URL')
    if (!appId || !secret) {
      return jsonResponse({ error: 'Shopee Affiliate credentials are not configured' }, 500)
    }

    const endpoint = configuredApiUrl?.trim() || SHOPEE_DEFAULT_API_URL
    let endpointUrl: URL
    try {
      endpointUrl = new URL(endpoint)
    } catch {
      return jsonResponse({ error: 'Invalid Shopee API URL configuration' }, 500)
    }
    if (endpointUrl.protocol !== 'https:') {
      return jsonResponse({ error: 'Shopee API URL must use HTTPS' }, 500)
    }

    let query: string
    let operationName: string
    let variables: Record<string, unknown>
    const datafeedId = input.datafeedId

    if (datafeedId === undefined || datafeedId === null || datafeedId === '') {
      const feedMode = input.feedMode
      if (feedMode !== undefined && feedMode !== 'FULL' && feedMode !== 'DELTA') {
        return jsonResponse({ error: 'feedMode must be FULL or DELTA' }, 400)
      }
      query = LIST_FEEDS_QUERY
      operationName = 'ListItemFeeds'
      variables = feedMode === undefined ? {} : { feedMode }
    } else {
      if (typeof datafeedId !== 'string' || datafeedId.trim() === '') {
        return jsonResponse({ error: 'datafeedId must be a non-empty string' }, 400)
      }

      const offsetInput = input.offset === undefined || input.offset === null ? 0 : input.offset
      const limitInput = input.limit === undefined || input.limit === null ? 500 : input.limit
      if (!Number.isInteger(offsetInput) || Number(offsetInput) < 0) {
        return jsonResponse({ error: 'offset must be a non-negative integer' }, 400)
      }
      if (!Number.isInteger(limitInput) || Number(limitInput) < 1) {
        return jsonResponse({ error: 'limit must be a positive integer' }, 400)
      }

      query = GET_FEED_DATA_QUERY
      operationName = 'GetItemFeedData'
      variables = {
        datafeedId,
        offset: Number(offsetInput),
        limit: Math.min(Number(limitInput), 500),
      }
    }

    try {
      const { response: shopeeResponse, body } = await signedShopeeRequest(
        endpointUrl.toString(),
        appId,
        secret,
        query,
        operationName,
        variables,
      )

      const result = body && typeof body === 'object' ? body as Record<string, unknown> : {}
      const errors = Array.isArray(result.errors) ? result.errors : []
      if (errors.length > 0) {
        return jsonResponse({
          error: 'Shopee GraphQL request failed',
          errors: normalizeGraphQLErrors(errors),
        }, 502)
      }
      if (!shopeeResponse.ok) {
        return jsonResponse({ error: 'Shopee API request failed', upstreamStatus: shopeeResponse.status }, 502)
      }

      const data = result.data && typeof result.data === 'object'
        ? result.data as Record<string, unknown>
        : {}

      if (operationName === 'ListItemFeeds') {
        const listResult = data.listItemFeeds && typeof data.listItemFeeds === 'object'
          ? data.listItemFeeds as Record<string, unknown>
          : {}
        if (!Array.isArray(listResult.feeds)) {
          return jsonResponse({ error: 'Unexpected listItemFeeds response from Shopee' }, 502)
        }
        const feeds = listResult.feeds
        const datafeedIds = feeds.flatMap((feed) => {
          if (!feed || typeof feed !== 'object') return []
          const id = (feed as Record<string, unknown>).datafeedId
          return typeof id === 'string' || typeof id === 'number' ? [id] : []
        })
        return jsonResponse({ feeds, datafeedIds })
      }

      const feedResult = data.getItemFeedData && typeof data.getItemFeedData === 'object'
        ? data.getItemFeedData as Record<string, unknown>
        : null
      if (!feedResult || !Array.isArray(feedResult.rows) || !feedResult.pageInfo) {
        return jsonResponse({ error: 'Unexpected getItemFeedData response from Shopee' }, 502)
      }
      return jsonResponse({ rows: feedResult.rows, pageInfo: feedResult.pageInfo })
    } catch {
      console.error('Shopee Affiliate request failed')
      return jsonResponse({ error: 'Shopee Affiliate request failed' }, 502)
    }
  }),
}
