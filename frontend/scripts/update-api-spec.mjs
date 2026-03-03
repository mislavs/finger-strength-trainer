import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

function getCliArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`))
  if (arg) {
    return arg.split("=").slice(1).join("=")
  }

  const index = process.argv.indexOf(name)
  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, "")
}

function toOpenApiUrl(urlOrBase) {
  if (urlOrBase.endsWith(".json")) {
    return urlOrBase
  }

  return `${trimTrailingSlash(urlOrBase)}/swagger/v1/swagger.json`
}

async function fetchOpenApi(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.text()
}

async function readEnvValueFromFile(filePath, key) {
  try {
    const content = await readFile(filePath, "utf8")
    const regex = new RegExp(`^${key}=(.*)$`, "m")
    const match = content.match(regex)

    if (!match) {
      return undefined
    }

    return match[1].trim().replace(/^['"]|['"]$/g, "")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined
    }

    throw error
  }
}

async function resolveViteApiBaseUrl() {
  if (process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL
  }

  const cwd = process.cwd()
  const localValue = await readEnvValueFromFile(
    path.resolve(cwd, ".env.local"),
    "VITE_API_BASE_URL",
  )
  if (localValue) {
    return localValue
  }

  return readEnvValueFromFile(path.resolve(cwd, ".env"), "VITE_API_BASE_URL")
}

const cliUrl = getCliArg("--url")
const openApiUrlFromEnv = process.env.FINGER_STRENGTH_OPENAPI_URL
const viteOpenApiUrl = process.env.VITE_OPENAPI_URL
const viteApiBaseUrl = await resolveViteApiBaseUrl()
const derivedFromViteBase =
  viteApiBaseUrl && /^https?:\/\//.test(viteApiBaseUrl) ? toOpenApiUrl(viteApiBaseUrl) : undefined

const candidates = [
  cliUrl,
  openApiUrlFromEnv,
  viteOpenApiUrl,
  derivedFromViteBase,
  "http://localhost:5283/swagger/v1/swagger.json",
].filter(Boolean)

const failures = []
let payload
let resolvedUrl

for (const candidate of candidates) {
  try {
    payload = await fetchOpenApi(candidate)
    resolvedUrl = candidate
    break
  } catch (error) {
    failures.push(`${candidate} -> ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (!payload || !resolvedUrl) {
  throw new Error(
    ["Could not download OpenAPI spec from any configured endpoint.", ...failures].join("\n"),
  )
}

const openApiPath = path.resolve(process.cwd(), "openapi.json")
await writeFile(openApiPath, payload, "utf8")

console.log(`OpenAPI spec updated from ${resolvedUrl}`)
