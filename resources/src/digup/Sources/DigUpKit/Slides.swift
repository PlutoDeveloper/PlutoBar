import Foundation

/// [PlutoBar] PowerPoint decks (pptx, ppsx, potx), read slide by slide: each slide's text and its speaker notes,
/// in the deck's own order. The indexer makes one chunk per slide, so a match's place is its slide number, the way a
/// PDF match's is its page. A deck is a zip of XML parts; macOS's unzip reads them (no unpacking to disk).
enum SlidesExtractor {
    static let extensions: Set<String> = ["pptx", "ppsx", "potx", "pptm"]

    static func isDeck(_ url: URL) -> Bool { extensions.contains(url.pathExtension.lowercased()) }

    /// A slide's text is cut at this many characters, so slide n is always chunk n.
    static let maxSlideText = 3000

    /// One string per slide, in order (an empty slide gives "Slide n").
    static func slides(of url: URL) throws -> [String] {
        let entries = try list(url)
        let slideParts = entries.filter { $0.range(of: #"^ppt/slides/slide\d+\.xml$"#, options: .regularExpression) != nil }
        guard !slideParts.isEmpty else { throw ExtractError.empty("no slides") }
        let order = (try? slideOrder(url, entries: entries)).flatMap { $0.isEmpty ? nil : $0 } ?? slideParts.sorted { number($0) < number($1) }
        return order.enumerated().map { index, part in
            var text = (try? read(url, part)).map(paragraphs) ?? ""
            if let notes = try? notesPart(url, slide: part, entries: entries), let xml = try? read(url, notes) {
                // The notes page repeats the slide number in a placeholder; a lone number isn't a note.
                let note = paragraphs(xml).split(separator: "\n").filter { $0.range(of: #"^\s*\d+\s*$"#, options: .regularExpression) == nil }
                    .joined(separator: "\n")
                if !note.isEmpty { text += (text.isEmpty ? "" : "\n\n") + "Notes: " + note }
            }
            text = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if text.isEmpty { text = "Slide \(index + 1)" }
            return String(text.prefix(maxSlideText))
        }
    }

    // MARK: The deck's parts

    /// The slides in presentation order: presentation.xml lists them (sldIdLst) by relationship id, and its .rels
    /// file says which part each id is.
    private static func slideOrder(_ url: URL, entries: [String]) throws -> [String] {
        let presentation = try read(url, "ppt/presentation.xml")
        let rels = try read(url, "ppt/_rels/presentation.xml.rels")
        let targets = relationships(rels)
        let ids = matches(#"<p:sldId\b[^>]*\br:id="([^"]+)""#, in: presentation)
        return ids.compactMap { id in
            guard let target = targets[id] else { return nil }
            let part = resolve(target, from: "ppt/")
            return entries.contains(part) ? part : nil
        }
    }

    /// The notes part for a slide, from the slide's own .rels file.
    private static func notesPart(_ url: URL, slide: String, entries: [String]) throws -> String? {
        let name = (slide as NSString).lastPathComponent
        let relsPath = "ppt/slides/_rels/\(name).rels"
        guard entries.contains(relsPath) else { return nil }
        let rels = try read(url, relsPath)
        for m in matchGroups(#"<Relationship\b([^>]*)/?>"#, in: rels) {
            let attributes = m[0]
            guard attributes.contains("/notesSlide\""),
                  let target = matches(#"\bTarget="([^"]+)""#, in: attributes).first else { continue }
            let part = resolve(target, from: "ppt/slides/")
            return entries.contains(part) ? part : nil
        }
        return nil
    }

    private static func relationships(_ xml: String) -> [String: String] {
        var map: [String: String] = [:]
        for m in matchGroups(#"<Relationship\b([^>]*)/?>"#, in: xml) {
            let attributes = m[0]
            if let id = matches(#"\bId="([^"]+)""#, in: attributes).first, let target = matches(#"\bTarget="([^"]+)""#, in: attributes).first {
                map[id] = target
            }
        }
        return map
    }

    /// "slides/slide3.xml" from "ppt/" → "ppt/slides/slide3.xml"; "../notesSlides/n.xml" from "ppt/slides/" → "ppt/notesSlides/n.xml".
    private static func resolve(_ target: String, from folder: String) -> String {
        if target.hasPrefix("/") { return String(target.dropFirst()) }
        var parts = folder.split(separator: "/").map(String.init)
        for piece in target.split(separator: "/") {
            if piece == ".." { _ = parts.popLast() } else if piece != "." { parts.append(String(piece)) }
        }
        return parts.joined(separator: "/")
    }

    private static func number(_ part: String) -> Int {
        Int(part.replacingOccurrences(of: #"\D"#, with: "", options: .regularExpression)) ?? 0
    }

    // MARK: Text

    /// The text runs (<a:t>) of a part, a line per paragraph (<a:p>).
    static func paragraphs(_ xml: String) -> String {
        var lines: [String] = []
        for p in matchGroups(#"(?s)<a:p\b[^>]*>(.*?)</a:p>"#, in: xml) {
            let runs = matches(#"(?s)<a:t\b[^>]*>(.*?)</a:t>"#, in: p[0]).map(unescape)
            let line = runs.joined().trimmingCharacters(in: .whitespaces)
            if !line.isEmpty { lines.append(line) }
        }
        return lines.joined(separator: "\n")
    }

    private static func unescape(_ s: String) -> String {
        var t = s
        for (entity, character) in ["&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'"] {
            t = t.replacingOccurrences(of: entity, with: character)
        }
        t = t.replacingOccurrences(of: #"&#x([0-9A-Fa-f]+);"#, with: " ", options: .regularExpression)
        t = t.replacingOccurrences(of: #"&#([0-9]+);"#, with: " ", options: .regularExpression)
        return t.replacingOccurrences(of: "&amp;", with: "&")
    }

    private static func matches(_ pattern: String, in text: String) -> [String] {
        matchGroups(pattern, in: text).map { $0[0] }
    }

    /// Each match's capture groups.
    private static func matchGroups(_ pattern: String, in text: String) -> [[String]] {
        guard let re = try? NSRegularExpression(pattern: pattern) else { return [] }
        return re.matches(in: text, range: NSRange(text.startIndex..., in: text)).map { m in
            (1..<max(m.numberOfRanges, 2)).map { i in
                Range(m.range(at: i), in: text).map { String(text[$0]) } ?? ""
            }
        }
    }

    // MARK: The zip

    private static func list(_ url: URL) throws -> [String] {
        try unzip(["-Z1", url.path]).split(separator: "\n").map(String.init)
    }

    private static func read(_ url: URL, _ part: String) throws -> String {
        try unzip(["-qq", "-p", url.path, part])
    }

    private static func unzip(_ arguments: [String]) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
        process.arguments = arguments   // -Z (list) must come first, so no shared flags
        let out = Pipe()
        process.standardOutput = out
        process.standardError = FileHandle.nullDevice
        try process.run()
        let data = out.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else { throw ExtractError.unreadable("not a readable deck (unzip \(process.terminationStatus))") }
        return String(decoding: data, as: UTF8.self)
    }
}
