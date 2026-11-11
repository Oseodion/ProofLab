# ProofLab

ProofLab is a developer studio for the Primus zkTLS attestation flow, plus a separate panel for DVC (data verification and computation). The tagline is the product rule: From web data attestation to verifiable computation without confusing the two

A verified attestation on this site means `verifyAttestation` returned `true`. That is a zkTLS attestation. A verified computation is a separate check: the DVC service returned status `done`, a proof fixture, and the Succinct prover line `Successfully verified proof!`. The computation panel talks to a DVC service only when `DVC_SERVICE_URL` is set.

This is an independent demo. It is not a Primus Labs product and does not imply an endorsement.

## What is live, and what waits on credentials

| Piece | Without credentials | With credentials |
| --- | --- | --- |
| Pages, copy, history, validation | Live | Live |
| `POST /api/primus/sign` | `503` naming `PRIMUS_APP_ID` and/or `PRIMUS_APP_SECRET` | `PrimusZKTLS.init(appId, appSecret)` then `sign(signParams)` |
| Browser attestation | The form renders. `init` fails until the [Primus Extension](https://chromewebstore.google.com/detail/primus/oeiomhmbaapihbilkfkhmlajkeegnjhe) is installed and `NEXT_PUBLIC_PRIMUS_APP_ID` is set | Extension flow from the [production example](https://github.com/primus-labs/zktls-demo/tree/main/production-example) |
| DVC submit / poll | Unavailable. The UI names the missing variable `DVC_SERVICE_URL` | Forwards `program_id` and `attestation_data` to `POST /submitTask` and polls `GET /getResult?task_id=`. `DVC_PROGRAM_ID` prefills the program UUID when set |

App ID and App Secret come from [Dev Hub projects](https://dev.primuslabs.xyz/myDevelopment/myProjects). Template IDs come from the [marketplace](https://dev.primuslabs.xyz/marketplace) or from a template on your project. The server App ID and `NEXT_PUBLIC_PRIMUS_APP_ID` must be the same project.

## Install

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local`. Leave `DVC_SERVICE_URL` empty until you have a service you are allowed to call.

## Local dev

```bash
npm run dev
```

The app listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

Desktop attestation needs the Primus Extension. `startAttestation` will not complete in a browser that does not have it. Phone user agents follow the production example: Android uses `android`, iPhone uses `ios`, everything else uses `pc`.

## Scripts

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Deployment

The Next.js app can deploy on Vercel. Set the same variables from `.env.example` in the project environment. `NEXT_PUBLIC_*` values are baked into the browser bundle at build time, so change them and rebuild.

Do not put `PRIMUS_APP_SECRET` in a `NEXT_PUBLIC_` variable. The SDK’s `sign()` constructs an `ethers.Wallet` from that secret, so it is a private key.

`vercel.json` is not required. Vercel detects Next.js.

The DVC prover does not belong on a serverless function. `dvc-service` in [DVC-Demo](https://github.com/primus-labs/DVC-Demo/tree/main/dvc-service) runs a Succinct prover binary and stores programs on disk. Host that process on a VM, then set `DVC_SERVICE_URL` to its base URL. The current DVC-Demo `.env.example` uses `http://localhost:38080`. `dvcapi.primuslabs.xyz` does not resolve, and this app does not assume a public prover.

Production Primus projects can require a domain whitelist. Add the deployed origin in Dev Hub or attestation requests fail at the extension or attestors.

## Architecture

```text
Browser
  PrimusZKTLS.init(NEXT_PUBLIC_PRIMUS_APP_ID, "", { platform })
  generateRequestParams(templateId, userAddress)
  setAdditionParams(optional JSON string)
  setAttMode({ algorithmType: "proxytls" | "mpctls" })
  POST /api/primus/sign { signParams }
  startAttestation(signResult)
  verifyAttestation(attestation) === true  →  Verified
  localStorage history

Route Handler /api/primus/sign
  read PRIMUS_APP_ID + PRIMUS_APP_SECRET
  PrimusZKTLS.init(appId, appSecret)
  sign(signParams) → { signResult }

Optional Route Handlers /api/dvc/*
  if DVC_SERVICE_URL is missing → 503 Unavailable
  POST /submitTask  form: program_id, attestation_data
  GET  /getResult?task_id=
```

Signing follows `production-example/server/index.js`. The browser follows `production-example/client/src/primus.js`, except the signed request is sent as JSON in a POST body instead of a query string, so large requests are not stuffed into a URL. `sign()` still receives the raw `AttRequest.toJsonString()` value. When “Retain the response for computation” is checked, the request sets `allJsonResponseFlag` to `"true"`. After `verifyAttestation` returns true, `getAllJsonResponse(requestid)` and `getPrivateData(requestid)` are kept in this tab’s `sessionStorage`, not in the localStorage history record.

DVC forwarding follows `DVC-Demo/dvc-client/src/prover_client.js` and `dvc-service/main.py`:

- `POST {DVC_SERVICE_URL}/uploadProgram` is how you create a `program_id`. ProofLab does not upload ELF files.
- `POST {DVC_SERVICE_URL}/submitTask` with form fields `program_id` and `attestation_data`
- `GET {DVC_SERVICE_URL}/getResult?task_id=`

`attestation_data` has two shapes, both defined in [zktls-att-verification](https://github.com/primus-labs/zktls-att-verification):

- Network (`network-succinct` branch, used by the DVC-Demo Succinct guest): `verification_type` is `HASH_COMPARSION` or `AES_DECRYPTION`, `public_data` is an array, and `private_data` holds `plain_json_response` or `aes_key`. The hash type is spelled `HASH_COMPARSION` in that crate.
- Enterprise AES (`main` branch): `public_data` is the enterprise attestation object and `private_data` is `{ "aes_key": "<32 hex chars>" }`.

A verified studio attestation is submitted from its result page only when it is already one of those documents, or when the SDK’s `privateData` contains that `aes_key` and the public object is an enterprise attestation. A reveal such as `{"screen_name":"web3_tech_"}` stays a zkTLS attestation. ProofLab does not re-encode its signature or invent private fields.

The service marks a task `done` even when the prover writes no fixture. ProofLab reports prover verification only when status is `done`, `proof_fixture` contains `proof` and `vk`, and the prover stdout contains `Successfully verified proof!`. That line is the prover’s own `verify` call. This app does not run an SP1 verifier.

### Routes

| Path | Role |
| --- | --- |
| `/` | The two steps, and whether this deployment has credentials |
| `/attest` | Run the attestation flow |
| `/results/[id]` | One zkTLS attestation from local history |
| `/history` | localStorage tasks |
| `/compute` | DVC explanation and optional live submit |
| `/trust` | Assumptions and limits |

## Tests

```bash
npm test
```

The suite covers form and sign-body validation, the `503` sign response when credentials are missing, redaction of `PRIMUS_APP_SECRET` from sign errors, the DVC proxy refusing to call the network when `DVC_SERVICE_URL` is missing, and the path where `verifyAttestation` returns `false`: the runner status is `unverified` and the result view renders **Unverified**.

### Not covered without Dev Hub credentials

These need a real project and are not faked in CI:

- `init` against the Primus Extension and a real attestor round trip
- `sign()` producing a signature the extension will accept for your template
- `startAttestation` completing against a marketplace or project template
- `verifyAttestation` returning `true` on a fresh attestation
- A DVC prove on your own host: `DVC_SERVICE_URL`, an uploaded Succinct ELF `program_id`, and `attestation_data` in the shape that guest expects

ProofLab does not ship a mock SNARK, a sample `testdata` attestation presented as new, or a hardcoded verifier address.

## Host the DVC prover

ProofLab does not mint `program_id` and it does not run the prover. From [DVC-Demo](https://github.com/primus-labs/DVC-Demo):

1. Install [SP1](https://docs.succinct.xyz/docs/sp1/getting-started/install) and build `dvc-succinct-program` to an ELF, then build `dvc-succinct-prover`.
2. Copy `dvc-service/.env.example` to `.env` and set `SUCCINCT_PROVER_BIN` to that prover binary.
3. `pip install -r dvc-service/requirements.txt` and `uvicorn main:app --host 0.0.0.0 --port 38080`.
4. `POST /uploadProgram` with the ELF. The response `program_id` is a UUID. Put that UUID in `DVC_PROGRAM_ID`.
5. Set `DVC_SERVICE_URL` to the base URL, for example `http://127.0.0.1:38080`. On Vercel this must be a URL the deployment can reach. Do not put a secret in either variable.
6. For a Network document, the ELF must be the DVC-Demo guest (`zktls-att-verification` branch `network-succinct`). `verification_type` must be `HASH_COMPARSION` or `AES_DECRYPTION`. For an enterprise ciphertext attestation plus `aes_key`, build the guest against `zktls-att-verification` `main` instead. The published Binance ELF will not verify an enterprise reveal.

A reveal template such as X Account Ownership puts the field in `attestation.data`. The result page explains why that object is not submitted.

## Known limitations

- `verifyAttestation` checks the attestor signature against the address in `@primuslabs/zktls-js-sdk`. Predicate checks (balance, score, URL allowlist) stay with your program.
- Service status `done` means the DVC service said `done`. Prover verification is a separate line and requires the proof fixture plus `Successfully verified proof!`.
- History, including revealed attestation fields, stays in this browser’s `localStorage` until you remove it or paste it into the compute form.
- The attest form leaves `computeMode` at the SDK default `normal`.
- The free-tier note in Primus enterprise docs (100 proofs per app id) is not displayed as a live quota. This app cannot read that counter.
- Domain whitelist and extension install are outside this repository.
- Dev mode sets `experimental.reactDebugChannel` to false. Next otherwise waits for the HMR debug channel to close before it hydrates, and a blocked `/_next/hmr` socket leaves the page inert. Production builds do not use that channel.

## Environment

See `.env.example`. Server variables are read at request time. Do not commit `.env` or `.env.local`.
