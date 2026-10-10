const path = require("path");
const fs = require("fs/promises");
const { fileURLToPath } = require("url");

// ============================================================
// PATCH: Node 22 fetch() tidak membaca file://
// Human menggunakan fetch() untuk load model.
// Kita intercept file:// lalu baca langsung dari filesystem.
// ============================================================

const nativeFetch = global.fetch;

global.fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input?.url;

  if (url && url.startsWith("file://")) {
    const filePath = fileURLToPath(url);
    const data = await fs.readFile(filePath);

    const contentType = filePath.endsWith(".json")
      ? "application/json"
      : "application/octet-stream";

    return new Response(data, {
      status: 200,
      headers: {
        "content-type": contentType,
      },
    });
  }

  return nativeFetch(input, init);
};

// ============================================================
// TensorFlow WASM
// ============================================================

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

// ============================================================
// Load Human WASM build
// ============================================================

const humanPath = path.join(
  process.cwd(),
  "node_modules",
  "@vladmandic",
  "human",
  "dist",
  "human.node-wasm.js"
);

const Human = require(humanPath).default;

// ============================================================
// Model path
// ============================================================

const modelsPath = path.join(
  process.cwd(),
  "node_modules",
  "@vladmandic",
  "human",
  "models"
);

const modelBasePath =
  `file://${modelsPath.replace(/\\/g, "/")}/`;

console.log("TensorFlow backend:", tf.getBackend());
console.log("Model base path:", modelBasePath);

// ============================================================
// Human configuration
// ============================================================

const human = new Human({
  backend: "wasm",

  debug: true,

  async: true,

  modelBasePath,

  face: {
    enabled: true,

    detector: {
      enabled: true,
      rotation: true,
      maxDetected: 2,
      minConfidence: 0.6,
    },

    mesh: {
      enabled: true,
    },

    description: {
      enabled: true,
    },

    iris: {
      enabled: false,
    },

    antispoof: {
      enabled: true,
    },

    liveness: {
      enabled: true,
    },
  },

  body: {
    enabled: false,
  },

  hand: {
    enabled: false,
  },

  object: {
    enabled: false,
  },

  gesture: {
    enabled: false,
  },
});

// ============================================================
// TEST
// ============================================================

async function main() {
  console.log("Loading Human models...");

  await human.load();

  console.log("Human models loaded successfully ✅");

  console.log("Backend:", human.tf.getBackend());

  console.log("Loaded models:");

  console.log({
    detector: human.models?.face?.detector?.model !== undefined,
    mesh: human.models?.face?.mesh?.model !== undefined,
    description:
      human.models?.face?.description?.model !== undefined,
    antispoof:
      human.models?.face?.antispoof?.model !== undefined,
    liveness:
      human.models?.face?.liveness?.model !== undefined,
  });

  console.log("Warming up...");

  await human.warmup();

  console.log("Human warmup completed ✅");

  console.log("HUMAN TEST SUCCESS ✅");
}

main().catch((error) => {
  console.error("HUMAN TEST FAILED ❌");
  console.error(error);
  process.exit(1);
});