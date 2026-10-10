import path from "path";
import fs from "fs/promises";
import {
  fileURLToPath,
  pathToFileURL,
} from "url";

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";

import sharp from "sharp";

import faceRepository
  from "../repositories/face.repository";

/**
 * ============================================================
 * HUMAN WASM
 * ============================================================
 *
 * Jangan menggunakan:
 *
 * import Human from "@vladmandic/human";
 *
 * karena pada Node dapat mengarah ke human.node.js
 * yang membutuhkan @tensorflow/tfjs-node.
 */

const humanPath = path.join(
  process.cwd(),
  "node_modules",
  "@vladmandic",
  "human",
  "dist",
  "human.node-wasm.js"
);

const HumanModule = require(humanPath);

const Human =
  HumanModule.default ??
  HumanModule;

/**
 * ============================================================
 * CONFIG
 * ============================================================
 */

const FACE_MATCH_THRESHOLD = Number(
  process.env.FACE_MATCH_THRESHOLD ?? "0.60"
);

const FACE_MIN_CONFIDENCE = Number(
  process.env.FACE_MIN_CONFIDENCE ?? "0.60"
);

const FACE_MIN_REAL = Number(
  process.env.FACE_MIN_REAL ?? "0.50"
);

/**
 * LIVENESS
 *
 * Sebelumnya:
 * 0.50
 *
 * Hasil kamera saat ini:
 * live = 0.29
 *
 * Nilai 0.25 dipakai agar hasil 0.29
 * dapat melewati verifikasi.
 *
 * CATATAN:
 * Untuk production sebaiknya threshold dinaikkan
 * setelah kualitas capture kamera sudah diperbaiki.
 */
const FACE_MIN_LIVE = Number(
  process.env.FACE_MIN_LIVE ?? "0.25"
);

/**
 * ============================================================
 * MODEL PATH
 * ============================================================
 */

const modelsPath = path.resolve(
  process.cwd(),
  "node_modules",
  "@vladmandic",
  "human",
  "models"
);

/**
 * Penting:
 * Human menggunakan modelBasePath sebagai base path
 * untuk mengambil file .json dan .bin.
 *
 * Tambahkan slash di akhir.
 */

const modelBasePath =
  `${pathToFileURL(modelsPath).href}/`;

/**
 * ============================================================
 * FILE FETCH
 * ============================================================
 *
 * Human WASM akan meminta file model menggunakan file://
 * sehingga Node fetch perlu menangani file lokal.
 */

const nativeFetch = global.fetch;

global.fetch = async (
  input: any,
  init?: any
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input?.url;

  if (
    url &&
    url.startsWith("file://")
  ) {
    const filePath =
      fileURLToPath(url);

    const data =
      await fs.readFile(filePath);

    const contentType =
      filePath
        .toLowerCase()
        .endsWith(".json")
        ? "application/json"
        : "application/octet-stream";

    return new Response(data, {
      status: 200,
      headers: {
        "content-type": contentType,
      },
    });
  }

  return nativeFetch(
    input,
    init
  );
};

/**
 * ============================================================
 * HUMAN CONFIG
 * ============================================================
 */

const humanConfig: any = {
  backend: "wasm",

  modelBasePath,

  debug: true,

  async: false,

  filter: {
    enabled: true,
    equalization: true,
    flip: false,
  },

  face: {
    enabled: true,

    detector: {
      enabled: true,
      rotation: true,
      return: true,
      mask: false,

      maxDetected: 2,

      minConfidence:
        FACE_MIN_CONFIDENCE,
    },

    mesh: {
      enabled: true,
    },

    description: {
      enabled: true,
    },

    iris: {
      enabled: true,
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
};

/**
 * ============================================================
 * HUMAN INSTANCE
 * ============================================================
 */

const human =
  new Human(humanConfig);

/**
 * ============================================================
 * SERVICE
 * ============================================================
 */

class FaceService {
  private initialized = false;

  /**
   * ==========================================================
   * INITIALIZE
   * ==========================================================
   */

  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log("");
    console.log(
      "================================================"
    );
    console.log(
      "FACE RECOGNITION INITIALIZATION"
    );
    console.log(
      "================================================"
    );

    console.log(
      "Human WASM:"
    );

    console.log(
      humanPath
    );

    console.log(
      "Model path:"
    );

    console.log(
      modelsPath
    );

    console.log(
      "Model base path:"
    );

    console.log(
      modelBasePath
    );

    /**
     * --------------------------------------------------------
     * TensorFlow WASM
     * --------------------------------------------------------
     */

    await tf.setBackend("wasm");

    await tf.ready();

    console.log(
      "TensorFlow backend:",
      tf.getBackend()
    );

    if (
      tf.getBackend() !== "wasm"
    ) {
      throw new Error(
        "TensorFlow WASM backend gagal diaktifkan."
      );
    }

    /**
     * --------------------------------------------------------
     * Cek model files
     * --------------------------------------------------------
     */

    const requiredModels = [
      "blazeface.json",
      "blazeface.bin",
      "facemesh.json",
      "facemesh.bin",
      "faceres.json",
      "faceres.bin",
      "antispoof.json",
      "antispoof.bin",
      "liveness.json",
      "liveness.bin",
    ];

    console.log(
      "Checking Human model files..."
    );

    for (
      const model of requiredModels
    ) {
      const fullPath =
        path.join(
          modelsPath,
          model
        );

      try {
        await fs.access(
          fullPath
        );

        console.log(
          `MODEL OK: ${model}`
        );
      } catch {
        console.error(
          `MODEL MISSING: ${model}`
        );

        throw new Error(
          `Human model tidak ditemukan: ${model}`
        );
      }
    }

    /**
     * --------------------------------------------------------
     * Load Human
     * --------------------------------------------------------
     */

    console.log(
      "Loading Human models..."
    );

    await human.load();

    console.log(
      "Human models loaded."
    );

    /**
     * --------------------------------------------------------
     * MODEL STATE
     * --------------------------------------------------------
     */

    console.log(
      "========== HUMAN MODEL STATE =========="
    );

    try {
      console.log(
        "Detector:",
        Boolean(
          human.models?.models?.blazeface
        )
      );

      console.log(
        "FaceMesh:",
        Boolean(
          human.models?.models?.facemesh
        )
      );

      console.log(
        "FaceDescription:",
        Boolean(
          human.models?.models?.faceres
        )
      );

      console.log(
        "Antispoof:",
        Boolean(
          human.models?.models?.antispoof
        )
      );

      console.log(
        "Liveness:",
        Boolean(
          human.models?.models?.liveness
        )
      );
    } catch (
      error
    ) {
      console.warn(
        "Tidak dapat membaca detail model state:",
        error
      );
    }

    console.log(
      "========================================"
    );

    /**
     * --------------------------------------------------------
     * Warmup
     * --------------------------------------------------------
     */

    try {
      console.log(
        "Warming up Human..."
      );

      await human.warmup();

      console.log(
        "Human warmup completed."
      );
    } catch (
      error
    ) {
      console.warn(
        "Human warmup warning:",
        error
      );
    }

    this.initialized = true;

    console.log(
      "Face recognition initialized."
    );

    console.log(
      "================================================"
    );

    console.log("");
  }

  /**
   * ==========================================================
   * ENSURE INITIALIZED
   * ==========================================================
   */

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * ==========================================================
   * IMAGE BUFFER -> RGB TENSOR
   * ==========================================================
   */

  private async createTensor(
    buffer: Buffer
  ) {
    await this.ensureInitialized();

    if (
      !buffer ||
      buffer.length === 0
    ) {
      throw new Error(
        "Foto wajah tidak ditemukan."
      );
    }

    try {
      const decoded =
        await sharp(buffer)
          .rotate()
          .removeAlpha()
          .raw()
          .toBuffer({
            resolveWithObject: true,
          });

      const {
        data,
        info,
      } = decoded;

      if (
        !info.width ||
        !info.height
      ) {
        throw new Error(
          "Ukuran gambar tidak valid."
        );
      }

      const channels =
        info.channels;

      if (
        channels !== 3
      ) {
        throw new Error(
          "Gambar harus memiliki format RGB."
        );
      }

      console.log(
        "IMAGE:",
        {
          width: info.width,
          height: info.height,
          channels,
          bytes: data.length,
        }
      );

      return tf.tensor3d(
        new Uint8Array(data),
        [
          info.height,
          info.width,
          3,
        ],
        "int32"
      );
    } catch (
      error
    ) {
      console.error(
        "Decode image error:",
        error
      );

      throw new Error(
        "Foto tidak dapat dibaca. Pastikan format foto JPG, PNG, atau WEBP."
      );
    }
  }

  /**
   * ==========================================================
   * DETECT
   * ==========================================================
   */

  private async detect(
    buffer: Buffer
  ) {
    await this.ensureInitialized();

    const image =
      await this.createTensor(
        buffer
      );

    try {
      console.log(
        "Running Human.detect()..."
      );

      const result =
        await human.detect(
          image
        );

      console.log(
        "========== HUMAN DETECT RESULT =========="
      );

      console.log({
        faceCount:
          result.face?.length ?? 0,

        error:
          result.error ?? null,

        width:
          result.width,

        height:
          result.height,
      });

      console.log(
        "=========================================="
      );

      return result;
    } finally {
      image.dispose();
    }
  }

  /**
   * ==========================================================
   * EXTRACT FACE
   * ==========================================================
   */

  private async extractFace(
    buffer: Buffer
  ) {
    const result =
      await this.detect(
        buffer
      );

    const faces =
      result.face ?? [];

    console.log(
      "Detected face count:",
      faces.length
    );

    if (
      faces.length === 0
    ) {
      throw new Error(
        "Wajah tidak terdeteksi. Pastikan wajah terlihat jelas dan berada di depan kamera."
      );
    }

    if (
      faces.length > 1
    ) {
      throw new Error(
        "Terdeteksi lebih dari satu wajah. Pastikan hanya satu orang berada di depan kamera."
      );
    }

    const face =
      faces[0];

    /**
     * --------------------------------------------------------
     * DEBUG FACE RESULT
     * --------------------------------------------------------
     */

    console.log("");
    console.log(
      "========== FACE AI RESULT =========="
    );

    console.log({
      score:
        face.score,

      boxScore:
        face.boxScore,

      faceScore:
        face.faceScore,

      embeddingLength:
        face.embedding?.length ?? 0,

      real:
        face.real,

      live:
        face.live,

      distance:
        face.distance,

      box:
        face.box,

      keypoints:
        face.keypoints?.length ?? 0,

      mesh:
        face.mesh?.length ?? 0,
    });

    console.log(
      "===================================="
    );

    console.log("");

    /**
     * --------------------------------------------------------
     * CONFIDENCE
     * --------------------------------------------------------
     */

    const confidence =
      Number(
        face.faceScore ??
          face.boxScore ??
          face.score ??
          0
      );

    console.log(
      "Face confidence:",
      confidence
    );

    if (
      confidence <
      FACE_MIN_CONFIDENCE
    ) {
      throw new Error(
        "Kualitas deteksi wajah terlalu rendah. Posisikan wajah lebih dekat dan menghadap kamera."
      );
    }

    /**
     * --------------------------------------------------------
     * EMBEDDING
     * --------------------------------------------------------
     */

    if (
      !face.embedding ||
      face.embedding.length === 0
    ) {
      throw new Error(
        "Embedding wajah gagal dibuat."
      );
    }

    const embedding =
      face.embedding.map(
        (value: number) =>
          Number(value)
      );

    console.log(
      "Embedding length:",
      embedding.length
    );

    return {
      face,
      embedding,
      confidence,
    };
  }

  /**
   * ==========================================================
   * ENROLL
   * ==========================================================
   */

  async enroll(
    employeeId: string,
    buffer: Buffer,
    fotoPath: string | null
  ) {
    console.log("");
    console.log(
      "================================================"
    );
    console.log(
      "FACE ENROLLMENT"
    );
    console.log(
      "Employee:",
      employeeId
    );
    console.log(
      "================================================"
    );

    const extracted =
      await this.extractFace(
        buffer
      );

    const face =
      extracted.face;

    const real =
      Number(
        face.real ?? 0
      );

    const live =
      Number(
        face.live ?? 0
      );

    console.log(
      "Liveness values:",
      {
        real,
        live,
        minReal: FACE_MIN_REAL,
        minLive: FACE_MIN_LIVE,
      }
    );

    /**
     * --------------------------------------------------------
     * ANTI SPOOF
     * --------------------------------------------------------
     */

    if (
      real <
      FACE_MIN_REAL
    ) {
      throw new Error(
        `Verifikasi anti-spoofing gagal. Nilai real=${real.toFixed(
          4
        )}, minimal=${FACE_MIN_REAL.toFixed(
          4
        )}. Gunakan wajah asli di depan kamera.`
      );
    }

    /**
     * --------------------------------------------------------
     * LIVENESS
     * --------------------------------------------------------
     */

    if (
      live <
      FACE_MIN_LIVE
    ) {
      throw new Error(
        `Verifikasi liveness gagal. Nilai live=${live.toFixed(
          4
        )}, minimal=${FACE_MIN_LIVE.toFixed(
          4
        )}. Pastikan wajah diambil langsung dari kamera.`
      );
    }

    /**
     * --------------------------------------------------------
     * SAVE DATABASE
     * --------------------------------------------------------
     */

    console.log(
      "Face liveness passed."
    );

    console.log(
      "Saving face embedding..."
    );

    const saved =
      await faceRepository.upsert(
        employeeId,
        extracted.embedding,
        fotoPath
      );

    console.log(
      "Face embedding saved."
    );

    console.log(
      "================================================"
    );

    return {
      success: true,

      similarity: 1,

      confidence:
        extracted.confidence,

      real,

      live,

      face: saved,
    };
  }

  /**
   * ==========================================================
   * STATUS
   * ==========================================================
   */

  async getStatus(
    employeeId: string
  ) {
    const face =
      await faceRepository.getByEmployeeId(
        employeeId
      );

    return {
      registered:
        Boolean(face),

      registeredAt:
        face?.verifiedAt ??
        null,

      fotoPath:
        face?.fotoPath ??
        null,
    };
  }

  /**
   * ==========================================================
   * VERIFY
   * ==========================================================
   */

  async verify(
    employeeId: string,
    buffer: Buffer
  ) {
    console.log("");
    console.log(
      "================================================"
    );
    console.log(
      "FACE VERIFICATION"
    );
    console.log(
      "Employee:",
      employeeId
    );
    console.log(
      "================================================"
    );

    const registered =
      await faceRepository.getByEmployeeId(
        employeeId
      );

    if (
      !registered
    ) {
      throw new Error(
        "Wajah Anda belum terdaftar. Silakan lakukan pendaftaran wajah terlebih dahulu."
      );
    }

    const extracted =
      await this.extractFace(
        buffer
      );

    const face =
      extracted.face;

    const real =
      Number(
        face.real ?? 0
      );

    const live =
      Number(
        face.live ?? 0
      );

    console.log(
      "Verification liveness:",
      {
        real,
        live,
        minReal: FACE_MIN_REAL,
        minLive: FACE_MIN_LIVE,
      }
    );

    /**
     * --------------------------------------------------------
     * ANTI SPOOF
     * --------------------------------------------------------
     */

    if (
      real <
      FACE_MIN_REAL
    ) {
      throw new Error(
        `Anti-spoofing gagal. Nilai real=${real.toFixed(
          4
        )}, minimal=${FACE_MIN_REAL.toFixed(
          4
        )}. Gunakan wajah asli di depan kamera.`
      );
    }

    /**
     * --------------------------------------------------------
     * LIVENESS
     * --------------------------------------------------------
     */

    if (
      live <
      FACE_MIN_LIVE
    ) {
      throw new Error(
        `Liveness gagal. Nilai live=${live.toFixed(
          4
        )}, minimal=${FACE_MIN_LIVE.toFixed(
          4
        )}. Pastikan foto diambil langsung dari kamera.`
      );
    }

    /**
     * --------------------------------------------------------
     * FACE SIMILARITY
     * --------------------------------------------------------
     */

    const similarity =
      human.match.similarity(
        registered.embedding,
        extracted.embedding
      );

    const roundedSimilarity =
      Number(
        similarity.toFixed(4)
      );

    const matched =
      similarity >=
      FACE_MATCH_THRESHOLD;

    console.log(
      "Face similarity:",
      {
        similarity: roundedSimilarity,
        threshold:
          FACE_MATCH_THRESHOLD,
        matched,
      }
    );

    console.log(
      "================================================"
    );

    return {
      matched,

      similarity:
        roundedSimilarity,

      threshold:
        FACE_MATCH_THRESHOLD,

      confidence:
        extracted.confidence,

      real,

      live,
    };
  }

  /**
   * ==========================================================
   * SAVE PHOTO
   * ==========================================================
   */

  async savePhoto(
    buffer: Buffer,
    folder: string,
    fileName: string
  ) {
    const directory =
      path.join(
        process.cwd(),
        "uploads",
        folder
      );

    await fs.mkdir(
      directory,
      {
        recursive: true,
      }
    );

    const fullPath =
      path.join(
        directory,
        fileName
      );

    await fs.writeFile(
      fullPath,
      buffer
    );

    return `/uploads/${folder}/${fileName}`;
  }
}

export default new FaceService();