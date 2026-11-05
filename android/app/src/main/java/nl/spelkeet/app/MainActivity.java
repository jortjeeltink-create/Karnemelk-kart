package nl.spelkeet.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

/**
 * De Spelkeet als app: één scherm met een WebView die de site toont.
 *
 * - Pagina's van spelkeet.onrender.com openen in de app; andere links (WhatsApp, mail, andere sites) in de
 *   app die daarbij hoort.
 * - De terugknop gaat eerst terug binnen de site.
 * - Delen gaat via het deelmenu van Android: de site vindt de brug als window.SpelkeetApp (zie public/js/poort.js).
 * - Zonder internet bij het opstarten: een eigen pagina (assets/offline.html) met "Opnieuw proberen".
 */
public class MainActivity extends Activity {
    static final String HOST = "spelkeet.onrender.com";
    static final String START = "https://" + HOST + "/";
    static final String OFFLINE = "file:///android_asset/offline.html";
    static final int BG = Color.rgb(0x15, 0x0B, 0x18);

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        web = new WebView(this);
        web.setBackgroundColor(BG);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        fitBars(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage: je naam, instellingen, je profiel op deze telefoon
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // geluid in Karnemelk Kart
        s.setSupportMultipleWindows(false);    // target=_blank opent gewoon hier (of extern, zie hieronder)
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);                    // tekst even groot als in Chrome, zodat de speltafels niet verspringen
        s.setUserAgentString(s.getUserAgentString() + " SpelkeetApp/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Bridge(), "SpelkeetApp");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new WebChromeClient()); // nodig voor alert() en confirm()

        if (state != null) web.restoreState(state);
        if (state == null || web.getUrl() == null) web.loadUrl(urlFrom(getIntent()));

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
        }
    }

    // De balken van Android (klok, navigatie) en het toetsenbord mogen niet over de site heen vallen.
    private void fitBars(View root) {
        if (Build.VERSION.SDK_INT < 30) return; // oudere Android: dat regelt het systeem zelf (adjustResize)
        getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsets.CONSUMED;
        });
    }

    private String urlFrom(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        return data != null && isOurs(data) ? data.toString() : START;
    }

    static boolean isOurs(Uri u) {
        return "https".equals(u.getScheme()) && HOST.equalsIgnoreCase(u.getHost());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && isOurs(data)) web.loadUrl(data.toString());
    }

    private void back() {
        if (web.canGoBack()) web.goBack();
        else finish();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        back(); // Android 12 en ouder; nieuwer gaat via de OnBackInvokedCallback hierboven
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    private void openOutside(Uri u) {
        try {
            Intent i = "intent".equals(u.getScheme())
                    ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, u);
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            i.setComponent(null);
            i.setSelector(null);
            startActivity(i);
        } catch (ActivityNotFoundException | java.net.URISyntaxException e) {
            Toast.makeText(this, R.string.no_app, Toast.LENGTH_SHORT).show();
        }
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!req.isForMainFrame()) return false; // alleen hele pagina's sturen we eventueel naar buiten
            if (isOurs(u)) return false; // onze eigen pagina's: in de app
            openOutside(u);              // de rest: WhatsApp, mail, andere sites
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
            // geen verbinding bij het openen van een pagina: de eigen offline-pagina
            if (req.isForMainFrame() && isOurs(req.getUrl())) view.loadUrl(OFFLINE);
        }
    }

    /** Wat de site in de app extra kan: delen via het deelmenu van Android. */
    private class Bridge {
        @JavascriptInterface
        public void share(String title, String text, String url) {
            String body = text == null ? "" : text.trim();
            if (url != null && !url.isEmpty() && !body.contains(url)) body = body.isEmpty() ? url : body + "\n" + url;
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, body);
            if (title != null && !title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
            Intent chooser = Intent.createChooser(send, getString(R.string.share_title));
            runOnUiThread(() -> {
                try {
                    startActivity(chooser);
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, R.string.no_app, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String version() {
            return BuildConfig.VERSION_NAME;
        }
    }
}
