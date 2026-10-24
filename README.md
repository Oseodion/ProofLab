# ProofLab

ProofLab is a developer studio for the Primus zkTLS attestation flow, plus a separate panel for DVC (data verification and computation). The tagline is the product rule: From web data attestation to verifiable computation without confusing the two

A verified result on this site means `verifyAttestation` returned `true`. That is a zkTLS attestation. It is not a zkVM computation proof. The computation panel talks to a DVC service only when `DVC_SERVICE_URL` is set, and it shows that service’s JSON as the service returned it.

This is an independent demo. It is not a Primus Labs product and does not imply an endorsement.

## What is live, and what waits on credentials

| Piece | Without credentials | With credentials |
| --- | --- | --- |
| Pages, copy, history, validation | Live | Live |
| `POST /api/primus/sign` | `503` naming `PRIMUS_APP_ID` and/or `PRIMUS_APP_SECRET` | `PrimusZKTLS.init(appId, appSecret)` then `sign(signParams)` |
| Browser attestation | The form renders. `init` fails until the [Primus Extension](https://chromewebstore.google.com/detail/primus/oeiomhmbaapihbilkfkhmlajkeegnjhe) is installed and `NEXT_PUBLIC_PRIMUS_APP_ID` is set | Extension flow from the [production example](https://github.com/primus-labs/zktls-demo/tree/main/production-example) |
| DVC submit / poll | Unavailable. The UI names the missing variable `DVC_SERVICE_URL` | Forwards `program_id` and `attestation_data` to `POST /submitTask` and polls `GET /getResult?task_id=` |

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

The DVC prover does not belong on a serverless function. `dvc-service` runs a Succinct prover binary and stores programs on disk. Host that process on a VM or call an endpoint you are allowed to use, then set `DVC_SERVICE_URL` to its base URL. A public example host appears in DVC-Demo (`https://dvcapi.primuslabs.xyz:38080`). This app does not assume that host will accept anonymous traffic.

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

Signing follows `production-example/server/index.js`. The browser follows `production-example/client/src/primus.js`, except the signed request is sent as JSON in a POST body instead of a query string, so large requests are not stuffed into a URL. `sign()` still receives the raw `AttRequest.toJsonString()` value.

DVC forwarding follows `DVC-Demo/dvc-client/src/prover_client.js`:

- `POST {DVC_SERVICE_URL}/submitTask` with form fields `program_id` and `attestation_data`
- `GET {DVC_SERVICE_URL}/getResult?task_id=`

`program_id` in that service is a UUID from `POST /uploadProgram`. ProofLab does not upload ELF files. Build and upload the guest yourself, then paste the returned id.

An enterprise attestation object (`recipient`, `request`, `reponseResolve`, `signatures`, …) is not the DVC `attestation_data` document (`public_data`, `private_data`, `verification_type`). The compute form does not rewrite one into the other.

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
- A DVC prove: `DVC_SERVICE_URL`, an uploaded Succinct ELF `program_id`, and `attestation_data` in the shape that guest expects, then a SNARK checked by that program’s verifier contract

ProofLab does not ship a mock SNARK, a sample `testdata` attestation presented as new, or a hardcoded verifier address.

## Known limitations

- `verifyAttestation` checks the attestor signature against the address in `@primuslabs/zktls-js-sdk`. Predicate checks (balance, score, URL allowlist) stay with your program.
- Service status `done` means the DVC service said `done`. This app does not verify the SNARK.
- History, including revealed attestation fields, stays in this browser’s `localStorage` until you remove it or paste it into the compute form.
- The attest form leaves `computeMode` at the SDK default `normal`.
- The free-tier note in Primus enterprise docs (100 proofs per app id) is not displayed as a live quota. This app cannot read that counter.
- Domain whitelist and extension install are outside this repository.
- Dev mode sets `experimental.reactDebugChannel` to false. Next otherwise waits for the HMR debug channel to close before it hydrates, and a blocked `/_next/hmr` socket leaves the page inert. Production builds do not use that channel.

## Environment

See `.env.example`. Server variables are read at request time. Do not commit `.env` or `.env.local`.
