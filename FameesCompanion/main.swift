// Famees Companion — a desktop buddy in a denim jacket and jeans who pops up
// in the middle of the screen to ask Famees about water (every 30 min) and
// stretching (every 15 min).
//
// Build:  bash install.sh   (compiles, installs to ~/Applications, starts at login)

import AppKit
import SwiftUI
import AVFoundation

// MARK: - Settings

let userName = "Famees"
let waterInterval: TimeInterval = 30 * 60    // 30 minutes
let stretchInterval: TimeInterval = 15 * 60  // 15 minutes
let snoozeInterval: TimeInterval = 5 * 60    // "Remind me later" asks again after 5 minutes
let unansweredHideAfter: TimeInterval = 120  // an unanswered question hides after 2 minutes

// MARK: - Reminders

struct Reminder: Equatable {
    let id: String
    let question: String
    let spoken: String
    let yesReply: String
    let image: String
    let asksQuestion: Bool

    static let greeting = Reminder(
        id: "greeting",
        question: "Hi, \(userName)! 👋\nI'll check on you",
        spoken: "Hi \(userName)! I'll remind you about water every 30 minutes, and stretching every 15 minutes.",
        yesReply: "", image: "water", asksQuestion: false)

    static let water = Reminder(
        id: "water",
        question: "Hey, \(userName)\nHave you had water?",
        spoken: "Hey \(userName)! Have you had water? Did you have water?",
        yesReply: "Great job, \(userName)!\nKeep sipping 💧",
        image: "water", asksQuestion: true)

    static let stretch = Reminder(
        id: "stretch",
        question: "Hey, \(userName)\nHave you stretched your body or not?",
        spoken: "Hey \(userName)! Have you stretched your body or not?",
        yesReply: "Awesome, \(userName)!\nYour body thanks you 💪",
        image: "stretch", asksQuestion: true)
}

// MARK: - Shared state for the SwiftUI view

final class CompanionModel: ObservableObject {
    @Published var text = ""
    @Published var image = "water"
    @Published var showButtons = false
    @Published var visible = false
    var onYes: () -> Void = {}
    var onLater: () -> Void = {}
}

func characterImage(_ name: String) -> NSImage? {
    Bundle.main.url(forResource: name, withExtension: "png").flatMap { NSImage(contentsOf: $0) }
}

// MARK: - Views

/// Big yellow text with a red outline and an orange glow.
struct OutlinedText: View {
    let text: String

    var body: some View {
        let base = Text(text)
            .font(.system(size: 34, weight: .black, design: .rounded))
            .multilineTextAlignment(.center)
        ZStack {
            ForEach(0..<16, id: \.self) { i in
                let a = Double(i) / 16 * 2 * Double.pi
                base.foregroundColor(Color(red: 0.85, green: 0.12, blue: 0.05))
                    .offset(x: cos(a) * 3.5, y: sin(a) * 3.5)
            }
            base.foregroundStyle(LinearGradient(
                colors: [Color(red: 1, green: 0.93, blue: 0.3), Color(red: 1, green: 0.74, blue: 0.08)],
                startPoint: .top, endPoint: .bottom))
        }
        .shadow(color: Color.orange.opacity(0.8), radius: 10)
        .shadow(color: .black.opacity(0.5), radius: 5, y: 3)
        .fixedSize(horizontal: false, vertical: true)
    }
}

struct PillButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundColor(Color(white: 0.2))
                .padding(.horizontal, 22)
                .padding(.vertical, 11)
                .background(RoundedRectangle(cornerRadius: 12).fill(Color.white))
                .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
    }
}

struct CompanionView: View {
    @ObservedObject var model: CompanionModel
    @State private var bob = false

    var body: some View {
        VStack(spacing: 14) {
            OutlinedText(text: model.text)
                .frame(maxWidth: 520)
            if model.showButtons {
                HStack(spacing: 12) {
                    PillButton(title: "YES") { model.onYes() }
                    PillButton(title: "Remind me later") { model.onLater() }
                }
            }
            Group {
                if let img = characterImage(model.image) {
                    Image(nsImage: img).resizable().interpolation(.high).aspectRatio(contentMode: .fit)
                } else {
                    Text("🧍‍♂️").font(.system(size: 200))
                }
            }
            .frame(height: 380)
            .offset(y: bob ? -4 : 4)
        }
        .padding(20)
        .frame(width: 560, height: 700, alignment: .bottom)
        .scaleEffect(model.visible ? 1 : 0.5, anchor: .bottom)
        .opacity(model.visible ? 1 : 0)
        .animation(.spring(response: 0.45, dampingFraction: 0.65), value: model.visible)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) { bob = true }
        }
    }
}

// Lets the first click land on a button even though the app isn't active.
final class ClickThroughHostingView<Content: View>: NSHostingView<Content> {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

final class CompanionPanel: NSPanel {
    override var canBecomeKey: Bool { true }
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate {
    let model = CompanionModel()
    var panel: NSPanel!
    var statusItem: NSStatusItem!
    var waterTimer: Timer?
    var stretchTimer: Timer?
    var queue: [Reminder] = []
    var current: Reminder?
    var hideWork: DispatchWorkItem?
    let synth = AVSpeechSynthesizer()
    var muted = UserDefaults.standard.bool(forKey: "muted")
    var paused = false
    var muteItem: NSMenuItem!
    var pauseItem: NSMenuItem!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory) // no Dock icon, lives in the menu bar
        buildPanel()
        buildMenu()
        startTimers()
        enqueue(.greeting)
    }

    // Transparent, always-on-top window in the middle of the screen.
    func buildPanel() {
        panel = CompanionPanel(contentRect: NSRect(x: 0, y: 0, width: 560, height: 700),
                               styleMask: [.borderless, .nonactivatingPanel],
                               backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.hidesOnDeactivate = false
        panel.contentView = ClickThroughHostingView(rootView: CompanionView(model: model))

        model.onYes = { [weak self] in self?.answerYes() }
        model.onLater = { [weak self] in self?.remindLater() }
    }

    func buildMenu() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.title = "🧍‍♂️"
        statusItem.button?.toolTip = "\(userName)'s Companion"

        let menu = NSMenu()
        menu.addItem(withTitle: "Ask about water now", action: #selector(askWater), keyEquivalent: "w").target = self
        menu.addItem(withTitle: "Ask about stretching now", action: #selector(askStretch), keyEquivalent: "s").target = self
        menu.addItem(.separator())
        muteItem = menu.addItem(withTitle: "Mute voice", action: #selector(toggleMute), keyEquivalent: "")
        muteItem.target = self
        muteItem.state = muted ? .on : .off
        pauseItem = menu.addItem(withTitle: "Pause reminders", action: #selector(togglePause), keyEquivalent: "")
        pauseItem.target = self
        menu.addItem(.separator())
        menu.addItem(withTitle: "Quit Companion", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        statusItem.menu = menu
    }

    func startTimers() {
        waterTimer?.invalidate()
        stretchTimer?.invalidate()
        waterTimer = Timer.scheduledTimer(timeInterval: waterInterval, target: self,
                                          selector: #selector(askWater), userInfo: nil, repeats: true)
        stretchTimer = Timer.scheduledTimer(timeInterval: stretchInterval, target: self,
                                            selector: #selector(askStretch), userInfo: nil, repeats: true)
    }

    @objc func askWater() { enqueue(.water) }
    @objc func askStretch() { enqueue(.stretch) }

    @objc func toggleMute() {
        muted.toggle()
        UserDefaults.standard.set(muted, forKey: "muted")
        muteItem.state = muted ? .on : .off
        if muted { synth.stopSpeaking(at: .immediate) }
    }

    @objc func togglePause() {
        paused.toggle()
        pauseItem.state = paused ? .on : .off
        if paused {
            waterTimer?.invalidate(); stretchTimer?.invalidate()
            statusItem.button?.title = "💤"
        } else {
            startTimers()
            statusItem.button?.title = "🧍‍♂️"
        }
    }

    // At the 30-minute mark both reminders fire together; they're shown one after another.
    func enqueue(_ r: Reminder) {
        if paused && r.asksQuestion { return }
        if current == nil {
            show(r)
        } else if current != r && !queue.contains(r) {
            queue.append(r)
        }
    }

    func show(_ r: Reminder) {
        current = r
        model.text = r.question
        model.image = r.image
        model.showButtons = r.asksQuestion
        model.visible = false
        centerPanel()
        panel.orderFrontRegardless()
        DispatchQueue.main.async { [weak self] in self?.model.visible = true }
        NSSound(named: "Pop")?.play()
        say(r.spoken)
        scheduleHide(after: r.asksQuestion ? unansweredHideAfter : 7)
    }

    func answerYes() {
        guard let r = current else { return }
        model.text = r.yesReply
        model.showButtons = false
        say(r.yesReply)
        scheduleHide(after: 3.5)
    }

    func remindLater() {
        guard let r = current else { return }
        model.text = "Okay! I'll ask again\nin 5 minutes ⏰"
        model.showButtons = false
        say("Okay, I'll ask again in 5 minutes.")
        scheduleHide(after: 2.5)
        DispatchQueue.main.asyncAfter(deadline: .now() + snoozeInterval) { [weak self] in self?.enqueue(r) }
    }

    func scheduleHide(after seconds: TimeInterval) {
        hideWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.hide() }
        hideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    func hide() {
        hideWork?.cancel()
        model.visible = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            guard let self = self else { return }
            self.panel.orderOut(nil)
            self.current = nil
            if !self.queue.isEmpty {
                let next = self.queue.removeFirst()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in self?.enqueue(next) }
            }
        }
    }

    func centerPanel() {
        guard let screen = NSScreen.main else { return }
        let vf = screen.visibleFrame
        let size = panel.frame.size
        panel.setFrameOrigin(NSPoint(x: vf.midX - size.width / 2, y: vf.minY + max(0, (vf.height - size.height) / 2)))
    }

    // Speak the text aloud (emoji and line breaks stripped), preferring a male English voice.
    func say(_ text: String) {
        guard !muted else { return }
        let plain = String(String.UnicodeScalarView(text.unicodeScalars.filter { s in
            !(s.properties.isEmojiPresentation || s.value == 0xFE0F || s.value == 0x200D
              || (s.properties.isEmoji && s.value > 0x2000))
        })).replacingOccurrences(of: "\n", with: " ")
        synth.stopSpeaking(at: .immediate)
        let u = AVSpeechUtterance(string: plain)
        u.voice = Self.voice
        u.rate = 0.48
        synth.speak(u)
    }

    static let voice: AVSpeechSynthesisVoice? = {
        let voices = AVSpeechSynthesisVoice.speechVoices()
        return voices.first { $0.language == "en-US" && $0.gender == .male }
            ?? voices.first { $0.language.hasPrefix("en") && $0.gender == .male }
            ?? AVSpeechSynthesisVoice(language: "en-US")
    }()
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
