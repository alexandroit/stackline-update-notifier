# @stackline/update-notifier

Independent Stackline maintenance of `update-notifier@6.0.2`. Original authors, licenses, API entry points, module formats and engine requirements are preserved. This project is not endorsed by the upstream maintainers.

## Install and migrate

```sh
npm install @stackline/update-notifier@1.0.0
npm install update-notifier@npm:@stackline/update-notifier@1.0.0
```

The second form retains the historical dependency key and imports. The release version is independent from the upstream API version. Embedded upstream version strings stay unchanged unless a documented source rebuild requires otherwise.

## Release differences

This initial release adopts maintenance without changing runtime files; it does not claim to fix upstream bugs.

## Compatibility and release proof

The upstream history and selected source commit remain in this native GitHub fork. `.stackline/package.json` is the reviewed publication manifest; source/workspace manifests remain suitable for upstream build tests. `.stackline/upstream.tgz` is the exact integrity-verified npm baseline. `scripts/stackline-pack.py` retains all baseline files, changes only declared source overlays and metadata, and produces `artifact/payload-verification.json` with before/after hashes for every file. Source tests, explicit packed API checks and full payload checks run before publication.

The publish workflow downloads the exact successful CI artifact, requires CodeQL on the same commit, and verifies npm bytes, signatures, provenance, normal and aliased installation, and immutable release assets.

See [UPSTREAM.md](UPSTREAM.md) for the issue triage and upstream origin, the original README for the API, and [CHANGELOG.stackline.md](CHANGELOG.stackline.md) for release changes. Report package defects through this repository’s issue tracker; use GitHub private vulnerability reporting for security concerns.
