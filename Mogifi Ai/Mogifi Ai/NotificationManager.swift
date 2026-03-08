//
//  NotificationManager.swift
//  Mogifi Ai
//
//  Handles native iOS local notifications so they fire even when the app is backgrounded.
//  The web app sends schedule requests via WKScriptMessageHandler.
//

import UserNotifications

final class NotificationManager: NSObject {
    static let shared = NotificationManager()
    
    private override init() {
        super.init()
    }
    
    func requestPermission(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                completion(granted)
            }
        }
    }
    
    func scheduleNotification(id: String, title: String, body: String, triggerAt: TimeInterval?) {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            guard settings.authorizationStatus == .authorized else {
                self?.requestPermission { granted in
                    if granted {
                        self?.doSchedule(id: id, title: title, body: body, triggerAt: triggerAt)
                    }
                }
                return
            }
            self?.doSchedule(id: id, title: title, body: body, triggerAt: triggerAt)
        }
    }
    
    private func doSchedule(id: String, title: String, body: String, triggerAt: TimeInterval?) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let trigger: UNNotificationTrigger
        if let ts = triggerAt, ts > 0 {
            let interval = max(1, ts - Date().timeIntervalSince1970)
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        } else {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        }
        
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[NotificationManager] Failed to schedule: \(error.localizedDescription)")
            }
        }
    }
    
    func cancelNotification(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }
}
