# ProofLab content plan

Six educational posts for X. Each outline is a draft for a human to edit. Do not add engagement numbers, quotes from Primus, or a claim that Primus Labs ships, sponsors, or endorses ProofLab.

Suggested voice: a developer walking through a real SDK split. Link the repository and, once it exists, the deployment. Leave the URL blank until the deploy is real.

## 1. The mix-up

- Hook: A signed TLS transcript and a zkVM predicate are different artifacts, and demos keep gluing the words together.
- Point: zkTLS attestation answers “did this HTTPS response match the template, and did the attestor sign it?”
- Point: DVC computation answers “did a guest program accept that attestation data and satisfy a predicate?” The output people want on-chain is the SNARK.
- Point: ProofLab is a small studio that refuses to put the second label on the first result.
- Close: Thread continues with the actual SDK calls. No partnership claim.

## 2. Where the secret sits

- Hook: The production example signs on a server. Several browser demos put the app secret in a `VITE_` variable. That is a local-only pattern.
- Point: Browser steps, from `primus-labs/zktls-demo` `production-example`: `init(appId, "", { platform })`, `generateRequestParams`, optional `setAdditionParams` and `setAttMode`, then ask the server to sign.
- Point: Server steps: `init(appId, appSecret)` and `sign(signParams)`. The JS SDK treats the Dev Hub App Secret as an ethers wallet key.
- Point: ProofLab exposes `NEXT_PUBLIC_PRIMUS_APP_ID` only. `PRIMUS_APP_SECRET` stays in the Route Handler. Dev Hub: `https://dev.primuslabs.xyz/myDevelopment/myProjects`.
- Close: If the two app ids differ, the server rejects the sign instead of signing a different project.

## 3. One attestation, in order

- Hook: The method names are the product. Skip the diagram that says “proof generated” before `verifyAttestation` returns.
- Point: Template UUID from the marketplace or your own Dev Hub template.
- Point: `startAttestation` on desktop talks to the Primus Extension. No extension, no attestation. The SDK error says so.
- Point: `verifyAttestation` returns a boolean. ProofLab stores Verified only for `true`. `false` stays Unverified. A throw stays Failed.
- Close: The JSON on the result page is the attestation object (recipient, request, attestors, signatures). Link the enterprise attestation structure docs if you want readers to see the field list.

## 4. Computation is the next program

- Hook: Passing an attestation into a zkVM is a second integration, described in Primus DVC docs and DVC-Demo.
- Point: The client recovers plaintext locally and builds `attestation_data` (`public_data`, `private_data`, `verification_type`). That document is not the enterprise attestation object.
- Point: `POST /submitTask` takes `program_id` plus `attestation_data`. `program_id` comes from uploading a Succinct ELF. The guest is supposed to verify the attestation before the predicate.
- Point: `GET /getResult?task_id=` reports queued, running, done, or error. “done” is the service status. Verifying the SNARK is a verifier-contract problem, and ProofLab does not bundle a contract address it has not checked.
- Close: If `DVC_SERVICE_URL` is unset, the panel says Unavailable and names that variable. It does not draw a fake proof.

## 5. What you cannot unit-test

- Hook: A green CI run is not a Primus attestation.
- Point: Validation, the 503 when the secret is missing, and the Unverified UI for `verifyAttestation === false` can run with no Dev Hub project.
- Point: A real verified attestation needs an App ID, App Secret, a template, the extension, and a data source the template can reach. Production projects may also need the origin on a domain whitelist.
- Point: A real computation proof needs a prover host, an uploaded program, and attestation data shaped for that guest. `SP1_PROVER=mock` and committed sample JSON are easy to mistake for a demo. ProofLab leaves them out.
- Close: Say which of those credentials you actually had when you recorded the screen. If you did not have them, say the sign route returned 503.

## 6. What the demo is

- Hook: ProofLab is a Next.js studio for that split, built to be read as much as clicked.
- Point: Live path is the enterprise attestation studio. History stays in the browser. The trust page lists the attestor signature check, the extension, and the missing SNARK verification.
- Point: The computation panel is wired for a real DVC service and stays honest when that URL is empty.
- Point: It is an independent Epoch 2 learning demo. Primus Labs did not publish it.
- Close: Link the repo. Link a deployment only after you have deployed it. Invite readers to compare the two result labels on `/results` and `/compute`.
