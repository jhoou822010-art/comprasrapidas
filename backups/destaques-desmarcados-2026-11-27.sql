-- Os 16 produtos que estavam marcados como Destaque em 27/11/2026 (desmarcados a pedido).
-- Para marcar de novo, rode no SQL Editor do Supabase:
update cr_products set featured = true where id in (
'd2210781-78bb-45c3-bc0e-34b4c9d542d2','497e91ff-4e4f-4c46-a995-c4a451ab2dfe','2809f070-a81a-4574-bda1-6bf075a863bc',
'5162a280-563d-4f15-99a8-1b2251764675','8aac40cf-10e1-4de4-87e6-3fd9f9f3bc83','47c48300-b120-4c69-8bec-a9359afdf7a4',
'868cd7bd-0061-40b0-a5d1-6d37559a7346','17a6f58b-55a6-44a0-bb35-1b4b022b763d','174f7091-8e56-4156-9ed5-c41267ab8463',
'ccd3b0fc-0b19-411e-a3ec-8113532720ec','fa408f0a-917e-419c-a853-08cef1c6cf89','230473a6-fe5b-4935-bb42-69d8e8b2045f',
'c18e8f50-ed7f-42c9-99a0-f1b03ade5e08','991028e1-d2a0-40ce-8f4f-5986ff47b0a5','9d74b869-029e-4618-a1d7-74e6fc4c1017',
'12a03577-60df-49ec-9d48-4bfd78d69d4a');
