//
//  WebView.swift
//  Mogifi Ai
//
//  WKWebView wrapper for loading your Vercel web app.
//  Supports camera and photo library for food scanning.
//  Supports native local notifications via JS bridge.
//

import SwiftUI
import UIKit
import WebKit
import UniformTypeIdentifiers

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var loadError: String?
    
    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, loadError: $loadError)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.processPool = WKProcessPool()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // CRITICAL: Use default persistent store so localStorage (onboarding, subscription) persists
        // across app launches. Without this, data is cleared every time the app restarts.
        config.websiteDataStore = .default()
        
        // Register bridges: notifications + native storage (UserDefaults) for onboarding persistence
        let coordinator = context.coordinator
        config.userContentController.add(coordinator, name: "mogifiNotifications")
        config.userContentController.add(coordinator, name: "mogifiStorage")
        config.userContentController.add(coordinator, name: "mogifiFoodScan")
        
        // Inject storage bridge so web can use native UserDefaults (persists across app restarts)
        let storageScript = WKUserScript(
            source: """
            window.MogifiNativeStorage = {
              _callbacks: {},
              get: function(key) {
                var id = 's' + Date.now() + Math.random().toString(36).slice(2);
                var self = this;
                return new Promise(function(resolve) {
                  self._callbacks[id] = resolve;
                  window.webkit.messageHandlers.mogifiStorage.postMessage({action:'get',key:key,id:id});
                });
              },
              set: function(key, value) {
                window.webkit.messageHandlers.mogifiStorage.postMessage({action:'set',key:key,value:value});
              },
              _resolve: function(id, value) {
                if (this._callbacks[id]) { this._callbacks[id](value); delete this._callbacks[id]; }
              }
            };
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(storageScript)
        
        let webView = WKWebView(frame: .zero, configuration: config)
        coordinator.webView = webView
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.bounces = true
        webView.isOpaque = true
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.timeoutInterval = 60
        webView.load(request)
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {}
    
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        @Binding var isLoading: Bool
        @Binding var loadError: String?
        weak var webView: WKWebView?
        private var imagePickerDelegate: ImagePickerDelegate?
        private var foodScanDelegate: FoodScanDelegate?
        private var isNativeScanInProgress = false
        
        init(isLoading: Binding<Bool>, loadError: Binding<String?>) {
            _isLoading = isLoading
            _loadError = loadError
        }
        
        // MARK: - WKScriptMessageHandler (notifications + native storage)
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any] else { return }
            
            if message.name == "mogifiNotifications" {
                guard let action = body["action"] as? String, action == "schedule",
                      let id = body["id"] as? String,
                      let title = body["title"] as? String,
                      let msgBody = body["body"] as? String else { return }
                let triggerAt = body["triggerAt"] as? Double
                let ts = (triggerAt != nil && triggerAt! > 0) ? TimeInterval(triggerAt! / 1000.0) : nil
                NotificationManager.shared.scheduleNotification(id: id, title: title, body: msgBody, triggerAt: ts)
                return
            }
            
            if message.name == "mogifiFoodScan" {
                guard let action = body["action"] as? String, action == "scan",
                      let apiUrl = body["apiUrl"] as? String, !apiUrl.isEmpty else { return }
                let label = body["label"] as? String ?? ""
                let callbackId = body["callbackId"] as? String ?? ""
                DispatchQueue.main.async { [weak self] in
                    self?.startNativeFoodScan(apiUrl: apiUrl, label: label, callbackId: callbackId)
                }
                return
            }
            
            if message.name == "mogifiStorage" {
                guard let action = body["action"] as? String else { return }
                let prefix = "mogifi_"
                if action == "get" {
                    let key = body["key"] as? String ?? ""
                    let id = body["id"] as? String ?? ""
                    let value = UserDefaults.standard.string(forKey: prefix + key) ?? ""
                    let b64 = Data(value.utf8).base64EncodedString()
                    let js = "if(window.MogifiNativeStorage&&window.MogifiNativeStorage._resolve){var v='';try{v=atob('\(b64)')}catch(e){};window.MogifiNativeStorage._resolve('\(id)',v)}"
                    webView?.evaluateJavaScript(js)
                } else if action == "set" {
                    let key = body["key"] as? String ?? ""
                    let value = body["value"] as? String ?? ""
                    UserDefaults.standard.set(value, forKey: prefix + key)
                }
            }
        }
        
        // MARK: - WKNavigationDelegate
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
            loadError = nil
            NotificationManager.shared.requestPermission { _ in }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading = false
            // Don't show load error during native food scan (WebView may get spurious failures when camera/picker opens)
            if !isNativeScanInProgress {
                loadError = error.localizedDescription
            }
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            isLoading = false
            if !isNativeScanInProgress {
                loadError = error.localizedDescription
            }
        }
        
        // MARK: - WKUIDelegate - Required for file input / camera to work
        @available(iOS 18.4, *)
        func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
            self.webView = webView
            
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                let allowsCamera = parameters.allowsDirectories == false
                let vc = self.findViewController(from: webView)
            
            let alert = UIAlertController(title: "Choose Photo", message: nil, preferredStyle: .alert)
            
            if allowsCamera && UIImagePickerController.isSourceTypeAvailable(.camera) {
                alert.addAction(UIAlertAction(title: "Take Photo", style: .default) { [weak self] _ in
                    self?.presentImagePicker(sourceType: .camera, from: vc, completion: completionHandler)
                })
            }
            
            alert.addAction(UIAlertAction(title: "Choose from Library", style: .default) { [weak self] _ in
                self?.presentImagePicker(sourceType: .photoLibrary, from: vc, completion: completionHandler)
            })
            
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
                completionHandler(nil)
            })
            
            if let popover = alert.popoverPresentationController, let sourceView = vc?.view {
                popover.sourceView = sourceView
                popover.sourceRect = CGRect(x: sourceView.bounds.midX, y: sourceView.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            
            vc?.present(alert, animated: true)
            }
        }
        
        // MARK: - WKUIDelegate - JavaScript dialogs (centered on screen)
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let vc = findViewController(from: webView)
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            if let popover = alert.popoverPresentationController, let sourceView = vc?.view {
                popover.sourceView = sourceView
                popover.sourceRect = CGRect(x: sourceView.bounds.midX, y: sourceView.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            vc?.present(alert, animated: true)
        }
        
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let vc = findViewController(from: webView)
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            if let popover = alert.popoverPresentationController, let sourceView = vc?.view {
                popover.sourceView = sourceView
                popover.sourceRect = CGRect(x: sourceView.bounds.midX, y: sourceView.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            vc?.present(alert, animated: true)
        }
        
        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
            let vc = findViewController(from: webView)
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { textField in textField.text = defaultText }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text ?? "") })
            if let popover = alert.popoverPresentationController, let sourceView = vc?.view {
                popover.sourceView = sourceView
                popover.sourceRect = CGRect(x: sourceView.bounds.midX, y: sourceView.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            vc?.present(alert, animated: true)
        }
        
        private func findViewController(from view: UIView) -> UIViewController? {
            var responder: UIResponder? = view
            while let r = responder {
                if let vc = r as? UIViewController { return vc }
                responder = r.next
            }
            return nil
        }
        
        private func presentImagePicker(sourceType: UIImagePickerController.SourceType, from vc: UIViewController?, completion: @escaping ([URL]?) -> Void) {
            guard let vc = vc else { completion(nil); return }
            
            let delegate = ImagePickerDelegate(completion: completion) { [weak self] in
                self?.imagePickerDelegate = nil
            }
            imagePickerDelegate = delegate
            
            let picker = UIImagePickerController()
            picker.sourceType = sourceType
            picker.mediaTypes = [UTType.image.identifier]
            picker.allowsEditing = false
            picker.delegate = delegate
            vc.present(picker, animated: true)
        }
        
        private func startNativeFoodScan(apiUrl: String, label: String, callbackId: String) {
            guard let vc = findViewController(from: webView ?? UIView()) else { return }
            isNativeScanInProgress = true
            let delegate = FoodScanDelegate(apiUrl: apiUrl, label: label, callbackId: callbackId, webView: webView) { [weak self] in
                self?.foodScanDelegate = nil
                self?.isNativeScanInProgress = false
                self?.loadError = nil  // Clear any spurious load error from during scan
            }
            foodScanDelegate = delegate
            let picker = UIImagePickerController()
            picker.sourceType = .photoLibrary
            picker.mediaTypes = [UTType.image.identifier]
            picker.allowsEditing = false
            picker.delegate = delegate
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                let alert = UIAlertController(title: "Scan Food", message: nil, preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "Take Photo", style: .default) { [weak self] _ in
                    let p = UIImagePickerController()
                    p.sourceType = .camera
                    p.mediaTypes = [UTType.image.identifier]
                    p.allowsEditing = false
                    p.delegate = delegate
                    vc.present(p, animated: true)
                })
                alert.addAction(UIAlertAction(title: "Choose from Library", style: .default) { _ in
                    vc.present(picker, animated: true)
                })
                alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self] _ in
                    let d = self?.foodScanDelegate
                    d?.sendResult(error: "Cancelled")
                    d?.finish()
                })
                if let popover = alert.popoverPresentationController { popover.sourceView = vc.view; popover.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 0, height: 0) }
                vc.present(alert, animated: true)
            } else {
                vc.present(picker, animated: true)
            }
        }
    }
}

// Native food scan: upload directly from Swift to avoid WebView memory/load issues
private class FoodScanDelegate: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    let apiUrl: String
    let label: String
    let callbackId: String
    weak var webView: WKWebView?
    let onFinish: () -> Void
    
    init(apiUrl: String, label: String, callbackId: String, webView: WKWebView?, onFinish: @escaping () -> Void) {
        self.apiUrl = apiUrl
        self.label = label
        self.callbackId = callbackId
        self.webView = webView
        self.onFinish = onFinish
    }
    
    func finish() {
        onFinish()
    }
    
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)
        guard let image = info[.originalImage] as? UIImage else {
            showErrorAndFinish(message: "No image")
            return
        }
        let resized = Self.resize(image, maxDimension: 600)
        guard let jpegData = resized.jpegData(compressionQuality: 0.5) else {
            showErrorAndFinish(message: "Failed to compress")
            return
        }
        let base64 = jpegData.base64EncodedString()
        let dataUrl = "data:image/jpeg;base64,\(base64)"
        uploadToAPI(dataUrl: dataUrl)
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        sendResult(error: "Cancelled")
        finish()
    }
    
    private func uploadToAPI(dataUrl: String) {
        // Notify web that upload started (so "Analyzing" shows only after image is picked)
        webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('mogifiScanUploadStarted'));")
        guard let url = URL(string: apiUrl) else {
            showErrorAndFinish(message: "Invalid API URL")
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["imageData": dataUrl, "label": label]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        req.timeoutInterval = 90
        URLSession.shared.dataTask(with: req) { [weak self] data, response, err in
            DispatchQueue.main.async {
                guard let self = self else { return }
                if let err = err {
                    self.showErrorAndFinish(message: err.localizedDescription)
                    return
                }
                guard let data = data else {
                    self.showErrorAndFinish(message: "No response")
                    return
                }
                if let http = response as? HTTPURLResponse, http.statusCode != 200 {
                    var msg = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
                    if http.statusCode == 502 {
                        msg = "The server took too long to respond. Please try again—you can use a smaller photo or try in a moment."
                    } else if http.statusCode == 504 {
                        msg = "Request timed out. Please try again with a smaller photo."
                    }
                    self.showErrorAndFinish(message: msg)
                    return
                }
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let estimate = json["estimate"] as? [String: Any] {
                    self.showResultAndAddOption(estimate: estimate)
                    // onFinish called when user taps Add/Dismiss on alert
                } else if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let errMsg = json["error"] as? String {
                    self.showErrorAndFinish(message: errMsg)
                } else {
                    self.showErrorAndFinish(message: "Invalid response")
                }
            }
        }.resume()
    }
    
    func showResultAndAddOption(estimate: [String: Any]) {
        let name = estimate["name"] as? String ?? "Meal"
        let cal = (estimate["calories"] as? Int) ?? Int(estimate["calories"] as? Double ?? 0)
        let pro = (estimate["protein"] as? Int) ?? Int(estimate["protein"] as? Double ?? 0)
        let carb = (estimate["carbs"] as? Int) ?? Int(estimate["carbs"] as? Double ?? 0)
        let fat = (estimate["fats"] as? Int) ?? Int(estimate["fats"] as? Double ?? 0)
        let msg = "\(name)\n\(cal) cal · P:\(pro)g C:\(carb)g F:\(fat)g"
        let alert = UIAlertController(title: "Food scanned", message: msg, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Add to meals", style: .default) { [weak self] _ in
            self?.injectMealToWeb(estimate: estimate)
            self?.notifyScanComplete()
            self?.onFinish()
        })
        alert.addAction(UIAlertAction(title: "Dismiss", style: .cancel) { [weak self] _ in
            self?.notifyScanComplete()
            self?.onFinish()
        })
        DispatchQueue.main.async {
            var vc = self.webView?.window?.rootViewController ?? self.findVC()
            while let presented = vc?.presentedViewController { vc = presented }
            vc?.present(alert, animated: true)
        }
    }
    
    private func notifyScanComplete() {
        webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('mogifiScanComplete'));")
    }
    
    private func findVC() -> UIViewController? {
        var v: UIView? = webView
        while let r = v {
            if let vc = r.next as? UIViewController { return vc }
            v = r.superview
        }
        return nil
    }
    
    private func injectMealToWeb(estimate: [String: Any]) {
        let name = estimate["name"] as? String ?? "Meal"
        let cal = estimate["calories"] as? Int ?? Int(estimate["calories"] as? Double ?? 0)
        let pro = estimate["protein"] as? Int ?? Int(estimate["protein"] as? Double ?? 0)
        let carb = estimate["carbs"] as? Int ?? Int(estimate["carbs"] as? Double ?? 0)
        let fat = estimate["fats"] as? Int ?? Int(estimate["fats"] as? Double ?? 0)
        let detail: [String: Any] = ["name": name, "calories": cal, "protein": pro, "carbs": carb, "fats": fat]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: detail) else { return }
        let b64 = jsonData.base64EncodedString()
        let js = "var d=JSON.parse(atob('\(b64)'));window.dispatchEvent(new CustomEvent('mogifiMealAdded',{detail:d}));"
        webView?.evaluateJavaScript(js) { _, err in
            if err != nil {
                DispatchQueue.main.async {
                    let a = UIAlertController(title: "Add manually", message: "\(name): \(cal) cal", preferredStyle: .alert)
                    a.addAction(UIAlertAction(title: "OK", style: .default))
                    self.findVC()?.present(a, animated: true)
                }
            }
        }
    }
    
    func sendResult(estimate: [String: Any]? = nil, error: String? = nil) {
        let result: [String: Any]
        if let e = error {
            result = ["error": e]
        } else if let est = estimate {
            result = ["estimate": est]
        } else {
            result = ["error": "Unknown error"]
        }
        guard let jsonData = try? JSONSerialization.data(withJSONObject: result) else { return }
        let b64 = jsonData.base64EncodedString()
        let jsSafe = "if(window.__mogifiFoodScanCallbacks&&window.__mogifiFoodScanCallbacks['\(callbackId)']){try{var d=JSON.parse(atob('\(b64)'));window.__mogifiFoodScanCallbacks['\(callbackId)'](d);}catch(e){window.__mogifiFoodScanCallbacks['\(callbackId)']({error:String(e)});}delete window.__mogifiFoodScanCallbacks['\(callbackId)'];}"
        webView?.evaluateJavaScript(jsSafe)
    }
    
    private func showErrorAndFinish(message: String) {
        sendResult(error: message)
        let alert = UIAlertController(title: "Scan failed", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.onFinish()
        })
        DispatchQueue.main.async {
            var vc = self.webView?.window?.rootViewController ?? self.findVC()
            while let presented = vc?.presentedViewController { vc = presented }
            vc?.present(alert, animated: true)
        }
    }
    
    private static func resize(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let ratio = min(maxDimension / size.width, maxDimension / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }
}

// Helper to handle image picker result and save to temp file
private class ImagePickerDelegate: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    let completion: ([URL]?) -> Void
    let onFinish: () -> Void
    
    init(completion: @escaping ([URL]?) -> Void, onFinish: @escaping () -> Void) {
        self.completion = completion
        self.onFinish = onFinish
    }
    
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)
        
        guard let image = info[.originalImage] as? UIImage else {
            completion(nil)
            onFinish()
            return
        }
        
        // Resize and compress on native side to avoid WebView memory crash
        let resized = Self.resizeForFoodScan(image, maxDimension: 800)
        
        let tempDir = FileManager.default.temporaryDirectory
        let fileName = "photo_\(UUID().uuidString).jpg"
        let fileURL = tempDir.appendingPathComponent(fileName)
        
        if let data = resized.jpegData(compressionQuality: 0.6) {
            try? data.write(to: fileURL)
            completion([fileURL])
        } else {
            completion(nil)
        }
        onFinish()
    }
    
    private static func resizeForFoodScan(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        guard size.width > maxDimension || size.height > maxDimension else { return image }
        let ratio = min(maxDimension / size.width, maxDimension / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        completion(nil)
        onFinish()
    }
}
