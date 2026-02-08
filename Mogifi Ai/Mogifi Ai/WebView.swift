//
//  WebView.swift
//  Mogifi Ai
//
//  WKWebView wrapper for loading your Vercel web app.
//  Supports camera and photo library for food scanning.
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
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.bounces = true
        webView.isOpaque = false
        webView.backgroundColor = .white
        
        webView.load(URLRequest(url: url))
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {}
    
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        @Binding var isLoading: Bool
        @Binding var loadError: String?
        weak var webView: WKWebView?
        private var imagePickerDelegate: ImagePickerDelegate?
        
        init(isLoading: Binding<Bool>, loadError: Binding<String?>) {
            _isLoading = isLoading
            _loadError = loadError
        }
        
        // MARK: - WKNavigationDelegate
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
            loadError = nil
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
            
            let alert = UIAlertController(title: "Choose Photo", message: nil, preferredStyle: .actionSheet)
            
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
            
            if let popover = alert.popoverPresentationController {
                popover.sourceView = webView
                popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            
            vc?.present(alert, animated: true)
            }
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
        
        let tempDir = FileManager.default.temporaryDirectory
        let fileName = "photo_\(UUID().uuidString).jpg"
        let fileURL = tempDir.appendingPathComponent(fileName)
        
        if let data = image.jpegData(compressionQuality: 0.8) {
            try? data.write(to: fileURL)
            completion([fileURL])
        } else {
            completion(nil)
        }
        onFinish()
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        completion(nil)
        onFinish()
    }
}
