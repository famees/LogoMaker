// Famees Companion — a little desktop buddy in a shirt and jeans who
// reminds Famees to drink water (every 30 min) and stretch (every 15 min).
//
// Build:  ./install.sh   (compiles, installs to ~/Applications, starts at login)

import AppKit
import SwiftUI
import AVFoundation

// MARK: - Settings

let userName = "Famees"
let waterInterval: TimeInterval = 30 * 60    // 30 minutes
let stretchInterval: TimeInterval = 15 * 60  // 15 minutes
let unansweredHideAfter: TimeInterval = 120  // auto-hide an unanswered question after 2 min

// MARK: - Reminders

struct Reminder: Equatable {
    let id: String
    let question: String
    let yesReply: String
    let noReply: String
    let asksQuestion: Bool

    static let greeting = Reminder(
        id: "greeting",
        question: "Hi \(userName)! 👋 I'm your buddy. I'll ask about water every 30 minutes and stretching every 15 minutes.",
        yesReply: "", noReply: "", asksQuestion: false)

    static let water = Reminder(
        id: "water",
        question: "Hey \(userName)! Have you had water? 💧\nDid you have water, \(userName)?",
        yesReply: "Great job, \(userName)! Keep sipping. 😊",
        noReply: "Go grab a glass of water right now, \(userName)! 🥤",
        asksQuestion: true)

    static let stretch = Reminder(
        id: "stretch",
        question: "\(userName), have you stretched your body or not? 🙆‍♂️",
        yesReply: "Awesome, \(userName)! Your body says thank you. 💪",
        noReply: "Stand up and stretch for a minute, \(userName) — arms up, roll your shoulders, twist your back!",
        asksQuestion: true)
}

// MARK: - Shared state for the SwiftUI view

final class CompanionModel: ObservableObject {
    @Published var text = ""
    @Published var showButtons = false
    var onYes: () -> Void = {}
    var onNo: () -> Void = {}
    var onClose: () -> Void = {}
}

// MARK: - The character (shirt + jeans), drawn with shapes

let skin = Color(red: 0.96, green: 0.80, blue: 0.68)
let hair = Color(red: 0.20, green: 0.13, blue: 0.08)
let shirt = Color(red: 0.84, green: 0.28, blue: 0.27)
let shirtDark = Color(red: 0.66, green: 0.18, blue: 0.18)
let denim = Color(red: 0.19, green: 0.33, blue: 0.60)
let denimDark = Color(red: 0.13, green: 0.24, blue: 0.45)

struct Smile: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY))
        p.addQuadCurve(to: CGPoint(x: r.maxX, y: r.minY), control: CGPoint(x: r.midX, y: r.maxY * 1.6))
        return p
    }
}

struct Collar: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
        p.addLine(to: CGPoint(x: r.midX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}

struct Arm: View {
    var body: some View {
        VStack(spacing: -4) {
            RoundedRectangle(cornerRadius: 9).fill(shirt).frame(width: 20, height: 62)
            Circle().fill(skin).frame(width: 20, height: 20)
        }
        .frame(width: 20, height: 78)
    }
}

struct Person: View {
    @State private var wave = false
    @State private var bob = false

    var body: some View {
        ZStack {
            // Legs (jeans) + shoes
            RoundedRectangle(cornerRadius: 6).fill(denim).frame(width: 34, height: 86).offset(x: -19, y: 84)
            RoundedRectangle(cornerRadius: 6).fill(denim).frame(width: 34, height: 86).offset(x: 19, y: 84)
            Rectangle().fill(denimDark).frame(width: 2, height: 70).offset(x: 0, y: 76)
            Capsule().fill(Color(white: 0.15)).frame(width: 42, height: 14).offset(x: -23, y: 128)
            Capsule().fill(Color(white: 0.15)).frame(width: 42, height: 14).offset(x: 23, y: 128)

            // Left arm, relaxed
            Arm().rotationEffect(.degrees(8), anchor: .top).offset(x: -48, y: 3)
            // Right arm, waving
            Arm().rotationEffect(.degrees(wave ? -165 : -125), anchor: .top).offset(x: 48, y: 3)

            // Shirt
            RoundedRectangle(cornerRadius: 16).fill(shirt).frame(width: 84, height: 86).offset(y: 0)
            Rectangle().fill(shirtDark).frame(width: 2, height: 74).offset(y: 4)
            ForEach(0..<4) { i in
                Circle().fill(Color.white.opacity(0.9)).frame(width: 5, height: 5)
                    .offset(x: 5, y: CGFloat(-22 + i * 16))
            }
            // Belt
            Rectangle().fill(Color(red: 0.36, green: 0.22, blue: 0.12)).frame(width: 82, height: 7).offset(y: 42)
            Rectangle().fill(Color(red: 0.85, green: 0.7, blue: 0.3)).frame(width: 10, height: 7).offset(y: 42)

            // Neck + collar
            Rectangle().fill(skin).frame(width: 18, height: 14).offset(y: -46)
            Collar().fill(skin).frame(width: 24, height: 18).offset(y: -35)
            Collar().stroke(Color.white, lineWidth: 3).frame(width: 30, height: 20).offset(y: -35)

            // Head
            Circle().fill(skin).frame(width: 66, height: 66).offset(y: -82)
            Ellipse().fill(hair).frame(width: 70, height: 34).offset(y: -108)
            Circle().fill(skin).frame(width: 10, height: 14).offset(x: -34, y: -80) // ears
            Circle().fill(skin).frame(width: 10, height: 14).offset(x: 34, y: -80)
            Circle().fill(Color.black).frame(width: 7, height: 7).offset(x: -12, y: -84)
            Circle().fill(Color.black).frame(width: 7, height: 7).offset(x: 12, y: -84)
            Circle().fill(Color.pink.opacity(0.35)).frame(width: 10, height: 6).offset(x: -20, y: -72)
            Circle().fill(Color.pink.opacity(0.35)).frame(width: 10, height: 6).offset(x: 20, y: -72)
            Smile().stroke(Color(red: 0.5, green: 0.2, blue: 0.15), style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .frame(width: 22, height: 8).offset(y: -66)
        }
        .frame(width: 170, height: 270)
        .offset(y: bob ? -3 : 3)
        .onAppear {
            withAnimation(.easeInOut(duration: 0.35).repeatForever(autoreverses: true)) { wave = true }
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) { bob = true }
        }
    }
}

// MARK: - Speech bubble + character

struct CompanionView: View {
    @ObservedObject var model: CompanionModel

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topTrailing) {
                VStack(spacing: 12) {
                    Text(model.text)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                    if model.showButtons {
                        HStack(spacing: 10) {
                            Button("Yes! ✅") { model.onYes() }
                                .keyboardShortcut(.defaultAction)
                            Button("Not yet") { model.onNo() }
                        }
                        .controlSize(.large)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 16)
                .frame(width: 290)

                Button(action: { model.onClose() }) {
                    Image(systemName: "xmark.circle.fill").foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
                .padding(8)
            }
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color(NSColor.windowBackgroundColor))
                    .shadow(color: .black.opacity(0.25), radius: 8, y: 3)
            )
            Collar()
                .fill(Color(NSColor.windowBackgroundColor))
                .frame(width: 22, height: 14)
                .offset(x: 30)

            Person()
        }
        .padding(12)
        .frame(width: 320)
    }
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

    // Floating, transparent, always-on-top window in the bottom-right corner.
    func buildPanel() {
        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 320, height: 470),
                        styleMask: [.borderless, .nonactivatingPanel],
                        backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.isMovableByWindowBackground = true
        panel.hidesOnDeactivate = false

        let host = NSHostingView(rootView: CompanionView(model: model))
        panel.contentView = host

        model.onYes = { [weak self] in self?.answer(yes: true) }
        model.onNo = { [weak self] in self?.answer(yes: false) }
        model.onClose = { [weak self] in self?.hide() }
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
        if current == nil {
            show(r)
        } else if current != r && !queue.contains(r) {
            queue.append(r)
        }
    }

    func show(_ r: Reminder) {
        current = r
        model.text = r.question
        model.showButtons = r.asksQuestion
        positionPanel()
        panel.alphaValue = 0
        panel.orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.4
            panel.animator().alphaValue = 1
        }
        NSSound(named: "Pop")?.play()
        say(r.question)
        scheduleHide(after: r.asksQuestion ? unansweredHideAfter : 9)
    }

    func answer(yes: Bool) {
        guard let r = current else { return }
        let reply = yes ? r.yesReply : r.noReply
        model.text = reply
        model.showButtons = false
        say(reply)
        scheduleHide(after: 6)
    }

    func scheduleHide(after seconds: TimeInterval) {
        hideWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.hide() }
        hideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    func hide() {
        hideWork?.cancel()
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.3
            panel.animator().alphaValue = 0
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
            guard let self = self else { return }
            self.panel.orderOut(nil)
            self.current = nil
            if !self.queue.isEmpty {
                let next = self.queue.removeFirst()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in self?.enqueue(next) }
            }
        }
    }

    func positionPanel() {
        guard let screen = NSScreen.main else { return }
        let vf = screen.visibleFrame
        let size = panel.contentView?.fittingSize ?? NSSize(width: 320, height: 470)
        panel.setContentSize(size)
        panel.setFrameOrigin(NSPoint(x: vf.maxX - size.width - 16, y: vf.minY + 8))
    }

    // Speak the text aloud (emoji stripped), preferring a male English voice.
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
