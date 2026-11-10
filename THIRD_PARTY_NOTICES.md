# Third-party notices

PlutoBar includes or downloads the following. Each keeps its own license.

## Included in this repository

| Component | Where | License |
| --- | --- | --- |
| [DigUp](https://github.com/ARahim3/DigUp) by Abdur Rahim | `resources/src/digup`, `resources/bin/digup` | MIT ([LICENSE](resources/src/digup/LICENSE)) |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | built into `resources/bin/digup` | MIT |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | `resources/bin/whisper-server` | MIT |
| [swift-transformers](https://github.com/huggingface/swift-transformers) | built into `resources/bin/digup` | Apache 2.0 |
| [Electron](https://www.electronjs.org) and the npm packages in `package.json` | `node_modules` (installed) | MIT and others, see each package |

## Downloaded on first use (not in this repository)

| Model | From | License |
| --- | --- | --- |
| EmbeddingGemma 2 (Google DeepMind) | Hugging Face | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) |
| ANEMLL's Neural Engine conversion of EmbeddingGemma 2 | [anemll/anemll-embeddinggemma-2-ane](https://huggingface.co/anemll/anemll-embeddinggemma-2-ane) | Apache 2.0 (model weights under the Gemma terms) |
| ggml-org's GGUF conversion of EmbeddingGemma 2 | [ggml-org/embeddinggemma-2-GGUF](https://huggingface.co/ggml-org/embeddinggemma-2-GGUF) | Gemma terms |
| Whisper large-v3 turbo (OpenAI) | Hugging Face (ggml format) | MIT |
| Kokoro-82M | Hugging Face | Apache 2.0 |

Apple's speech model (SpeechAnalyzer) is part of macOS and is downloaded by macOS itself.
