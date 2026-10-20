# DigUp's engine, in PlutoBar

This is the search engine of [DigUp](https://github.com/ARahim3/DigUp) by Abdur Rahim (MIT, see `LICENSE`), at the
commit in `UPSTREAM_COMMIT`: the `DigUpKit` engine, the `LlamaRuntime` that runs Google DeepMind's EmbeddingGemma 2 on
llama.cpp, and the `digup` command-line tool. PlutoBar ships `digup` inside the app and runs it to download the model,
index the folders you choose and search them, so nobody installs DigUp separately.

Left out: DigUp's own app, its Windows and Linux shell, and its tests. Changed (marked `[PlutoBar]`): `AppPaths.applicationSupport`
honors `DIGUP_HOME`, so the model and the index live in PlutoBar's own folder; and PowerPoint decks (pptx, ppsx,
potx, pptm) are read slide by slide with their speaker notes (`Slides.swift`), one chunk per slide, so a match
points at its slide.

Build it with `npm run build:digup` (it builds llama.cpp first, which needs CMake). The model (865 MB, Apache 2.0) is
downloaded on first use, not bundled.
