package com.brickgame.doisemum;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

// Abre o jogo guardado dentro do app (assets/index.html), em tela cheia. Não usa internet.
public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle salvo) {
        super.onCreate(salvo);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#3a3a3d"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // recordes e preferência de som
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setBlockNetworkLoads(true);          // nada sai do celular
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);
        if (salvo != null) web.restoreState(salvo); else web.loadUrl("file:///android_asset/index.html");
        telaCheia();
    }

    private void telaCheia() {
        if (Build.VERSION.SDK_INT >= 19) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @Override public void onWindowFocusChanged(boolean foco) { super.onWindowFocusChanged(foco); if (foco) telaCheia(); }
    @Override protected void onSaveInstanceState(Bundle b) { super.onSaveInstanceState(b); web.saveState(b); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }   // o jogo pausa sozinho ao sair
    @Override protected void onResume() { super.onResume(); web.onResume(); }
}
