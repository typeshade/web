# Import a procedural audio quality candidate

Engine PR #31 records actual-audio LLM feedback, bounded revisions and source receipts.
This exporter preserves one candidate's TypeShade functions, controls, source duration,
YouTube reference range and room settings in the existing project version 3 format.

1. Prepare a candidate with the engine's `bun run quality prepare DIRECTORY` command.
2. Run `bun scripts/export-quality-project.ts CANDIDATE_DIRECTORY OUTPUT.json` from `apps/typeaudio`.
3. Open `OUTPUT.json` through the studio's existing project file action.
4. Edit the TypeShade functions or their controls, then save the project.

The export contains source and scene data. It contains no generated JavaScript or video copy.
The source hash must match its candidate receipt. Existing output files are preserved.
Raw function-document import uses different duration and gain defaults; use this exporter
to preserve the evaluated candidate's scene settings. Source onset/end and master tapers
follow the published studio profile. Human listening approval and picture synchronization
remain separate checks. No new public template or deployment is part of this change.

Web base: `a43e156f9110eeb0b216d677acdec1894ad9162a`. Engine and compiler pins remain unchanged.
