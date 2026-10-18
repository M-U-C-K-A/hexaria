// Lanceur natif macOS : une fenêtre Cocoa qui héberge le jeu dans un WKWebView.
// Les fichiers du jeu sont servis depuis le bundle via le schéma hexaria://, et la sauvegarde
// passe par UserDefaults grâce à un petit pont JavaScript.
import Cocoa
import WebKit

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    let root: URL

    init(root: URL) {
        self.root = root
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst()))
        guard file.standardizedFileURL.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: file) else {
            task.didFailWithError(NSError(domain: "hexaria", code: 404))
            return
        }
        let headers = [
            "Content-Type": Self.mime(file.pathExtension),
            "Content-Length": "\(data.count)",
            "Cache-Control": "no-cache",
        ]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "webp": return "image/webp"
        case "jpg", "jpeg": return "image/jpeg"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        default: return "application/octet-stream"
        }
    }
}

final class SaveBridge: NSObject, WKScriptMessageHandler {
    static let key = "hexaria.save.v1"

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "hexariaSave":
            if let json = message.body as? String { UserDefaults.standard.set(json, forKey: Self.key) }
        case "hexariaClear":
            UserDefaults.standard.removeObject(forKey: Self.key)
        default:
            break
        }
    }

    // Script injecté au démarrage pour rendre la sauvegarde native au jeu.
    static func bootstrapScript() -> String {
        guard let saved = UserDefaults.standard.string(forKey: key),
              let data = try? JSONSerialization.data(withJSONObject: [saved]),
              let array = String(data: data, encoding: .utf8) else {
            return "window.__HEXARIA_SAVE__ = null;"
        }
        return "window.__HEXARIA_SAVE__ = \(array)[0];"
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    let bridge = SaveBridge()

    func applicationDidFinishLaunching(_ notification: Notification) {
        let root = Bundle.main.resourceURL!.appendingPathComponent("web")
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(root: root), forURLScheme: "hexaria")
        let content = config.userContentController
        content.add(bridge, name: "hexariaSave")
        content.add(bridge, name: "hexariaClear")
        content.addUserScript(WKUserScript(source: SaveBridge.bootstrapScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.setValue(false, forKey: "drawsBackground")

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Hexaria"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.backgroundColor = NSColor(red: 0.02, green: 0.05, blue: 0.045, alpha: 1)
        window.minSize = NSSize(width: 1100, height: 700)
        window.contentView = web
        window.center()
        window.setFrameAutosaveName("HexariaMainWindow")
        window.makeKeyAndOrderFront(nil)
        web.load(URLRequest(url: URL(string: "hexaria://app/index.html")!))
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

func buildMenu() -> NSMenu {
    let main = NSMenu()
    let appItem = NSMenuItem()
    main.addItem(appItem)
    let appMenu = NSMenu()
    appMenu.addItem(withTitle: "À propos de Hexaria", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
    appMenu.addItem(.separator())
    appMenu.addItem(withTitle: "Masquer Hexaria", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
    appMenu.addItem(withTitle: "Quitter Hexaria", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
    appItem.submenu = appMenu

    let viewItem = NSMenuItem()
    main.addItem(viewItem)
    let viewMenu = NSMenu(title: "Présentation")
    let fullscreen = NSMenuItem(title: "Plein écran", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
    fullscreen.keyEquivalentModifierMask = [.command, .control]
    viewMenu.addItem(fullscreen)
    viewItem.submenu = viewMenu
    return main
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.regular)
application.mainMenu = buildMenu()
application.run()
