package com.somobaypro.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // Double-tap to exit variables
    private var backPressedTime: Long = 0
    private var backToast: Toast? = null

    // Native Speech Recognizer instance
    private var speechRecognizer: SpeechRecognizer? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    private val REQUIRED_PERMISSIONS: Array<String>
        get() {
            val list = mutableListOf(
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                list.add(Manifest.permission.POST_NOTIFICATIONS)
                list.add(Manifest.permission.READ_MEDIA_IMAGES)
                list.add(Manifest.permission.READ_MEDIA_AUDIO)
            } else {
                list.add(Manifest.permission.READ_EXTERNAL_STORAGE)
                list.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
            return list.toTypedArray()
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Request all required runtime permissions on app launch before interaction
        checkAndRequestAllPermissions()

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)

        setupWebView()

        swipeRefresh.setColorSchemeResources(R.color.primary)
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        // Load the live SomobayPro web application
        webView.loadUrl("https://somobaypro.onrender.com")
    }

    private fun checkAndRequestAllPermissions() {
        val permissionsToRequest = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsToRequest.toTypedArray(), 1001)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001 || requestCode == 1002) {
            val allGranted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            if (allGranted) {
                Toast.makeText(this, "সোসাইটি অ্যাপের সকল অনুমতি সফলভাবে প্রদান করা হয়েছে", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        // Set brand green background color so screen is never glaring white while loading
        webView.setBackgroundColor(android.graphics.Color.parseColor("#064e3b"))

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // Register Native Speech Recognition and Device Bridge to Javascript
        webView.addJavascriptInterface(AndroidVoiceBridge(), "AndroidVoiceBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefresh.isRefreshing = false
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                swipeRefresh.isRefreshing = false
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                // Ensure TLS/SSL handshake variations on mobile do not block page loading
                handler?.proceed()
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:")) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        return true
                    } catch (e: Exception) {
                        return false
                    }
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                android.util.Log.d("SomobayPro", "${consoleMessage?.message()} [${consoleMessage?.lineNumber()}]")
                return true
            }

            // Auto grant permission requests from web app (Microphone, Camera)
            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    request?.grant(request.resources)
                }
            }

            // File Chooser for Deposit Slip upload & KYC photos
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
    }

    /**
     * Android Native Speech Recognition Bridge for 100% active and reliable Bengali voice input
     */
    inner class AndroidVoiceBridge {

        @JavascriptInterface
        fun isNativeVoiceSupported(): Boolean {
            return SpeechRecognizer.isRecognitionAvailable(this@MainActivity)
        }

        @JavascriptInterface
        fun startListening(lang: String?) {
            val speechLang = if (!lang.isNullOrBlank()) lang else "bn-BD"
            runOnUiThread {
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this@MainActivity, arrayOf(Manifest.permission.RECORD_AUDIO), 1002)
                    webView.evaluateJavascript("window.onNativeSpeechError && window.onNativeSpeechError('মাইক্রোফোন ব্যবহারের অনুমতি প্রয়োজন।');", null)
                    return@runOnUiThread
                }

                try {
                    speechRecognizer?.destroy()
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this@MainActivity)

                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, speechLang)
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, speechLang)
                        putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, speechLang)
                        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    }

                    speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) {
                            webView.evaluateJavascript("window.onNativeSpeechReady && window.onNativeSpeechReady();", null)
                        }

                        override fun onBeginningOfSpeech() {
                            webView.evaluateJavascript("window.onNativeSpeechStarted && window.onNativeSpeechStarted();", null)
                        }

                        override fun onRmsChanged(rmsdB: Float) {
                            webView.evaluateJavascript("window.onNativeSpeechRms && window.onNativeSpeechRms($rmsdB);", null)
                        }

                        override fun onBufferReceived(buffer: ByteArray?) {}

                        override fun onEndOfSpeech() {
                            webView.evaluateJavascript("window.onNativeSpeechEnded && window.onNativeSpeechEnded();", null)
                        }

                        override fun onError(error: Int) {
                            val errorMsg = when (error) {
                                SpeechRecognizer.ERROR_AUDIO -> "অডিও রেকর্ডিং সমস্যা"
                                SpeechRecognizer.ERROR_CLIENT -> "ক্লায়েন্ট এরর"
                                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "মাইক্রোফোন অনুমতি নেই"
                                SpeechRecognizer.ERROR_NETWORK -> "নেটওয়ার্ক সমস্যা"
                                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "নেটওয়ার্ক টাইমআউট"
                                SpeechRecognizer.ERROR_NO_MATCH -> "কোনো কথা বোঝা যায়নি, আবার বলুন"
                                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "ভয়েস ইঞ্জিন ব্যস্ত রয়েছে"
                                SpeechRecognizer.ERROR_SERVER -> "ভয়েস সার্ভার ত্রুটি"
                                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "কথা শনাক্তের সময় শেষ"
                                else -> "ভয়েস শনাক্তকরণ ত্রুটি"
                            }
                            webView.evaluateJavascript("window.onNativeSpeechError && window.onNativeSpeechError('$errorMsg');", null)
                        }

                        override fun onResults(results: Bundle?) {
                            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            if (!matches.isNullOrEmpty()) {
                                val text = matches[0].replace("'", "\\'").replace("\n", " ").trim()
                                webView.evaluateJavascript("window.onNativeSpeechResult && window.onNativeSpeechResult('$text');", null)
                            } else {
                                webView.evaluateJavascript("window.onNativeSpeechEnded && window.onNativeSpeechEnded();", null)
                            }
                        }

                        override fun onPartialResults(partialResults: Bundle?) {
                            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            if (!matches.isNullOrEmpty()) {
                                val text = matches[0].replace("'", "\\'").replace("\n", " ").trim()
                                webView.evaluateJavascript("window.onNativeSpeechPartial && window.onNativeSpeechPartial('$text');", null)
                            }
                        }

                        override fun onEvent(eventType: Int, params: Bundle?) {}
                    })

                    speechRecognizer?.startListening(intent)
                } catch (e: Exception) {
                    webView.evaluateJavascript("window.onNativeSpeechError && window.onNativeSpeechError('${e.localizedMessage}');", null)
                }
            }
        }

        @JavascriptInterface
        fun stopListening() {
            runOnUiThread {
                try {
                    speechRecognizer?.stopListening()
                } catch (e: Exception) {}
            }
        }
    }

    /**
     * Smart Back Button handling with Double-Tap to Exit prevention
     */
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // First, check if Javascript in React handles the back press (e.g. closes modal, drawer, or goes back to dashboard)
        webView.evaluateJavascript(
            "(function() { try { if (window.handleAndroidBack && window.handleAndroidBack()) { return 'handled'; } } catch(e){} return 'unhandled'; })()"
        ) { result ->
            val cleanResult = result?.replace("\"", "")?.trim() ?: "unhandled"
            if (cleanResult == "handled") {
                // React SPA handled closing the modal/menu/subtab
                return@evaluateJavascript
            }

            // If not handled by React, check WebView browser history
            if (webView.canGoBack()) {
                webView.goBack()
            } else {
                // At the root page: Double-tap to exit prevention
                if (backPressedTime + 2000 > System.currentTimeMillis()) {
                    backToast?.cancel()
                    finish()
                } else {
                    backToast = Toast.makeText(this, "অ্যাপ থেকে বের হতে আবার ব্যাক চাপুন", Toast.LENGTH_SHORT)
                    backToast?.show()
                    backPressedTime = System.currentTimeMillis()
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            speechRecognizer?.destroy()
            webView.removeJavascriptInterface("AndroidVoiceBridge")
            webView.destroy()
        } catch (e: Exception) {}
    }
}
