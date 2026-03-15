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
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // CRITICAL: Use default persistent store so localStorage (onboarding, subscription) persists
        // across app launches. Without this, data is cleared every time the app restarts.
        config.websiteDataStore = .default()
        
        // Register bridges: notifications + native storage (UserDefaults) for onboarding persistence
        let coordinator = context.coordinator
        config.userContentController.add(coordinator, name: "mogifiNotifications")
        config.userContentController.add(coordinator, name: "mogifiStorage")
        
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
        webView.load(request)
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {}
    
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        @Binding var isLoading: Bool
        @Binding var loadError: String?
        weak var webView: WKWebView?
        private var imagePickerDelegate: ImagePickerDelegate?
        
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
            loadError = error.localizedDescription
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            isLoading = false
            loadError = error.localizedDescription
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
