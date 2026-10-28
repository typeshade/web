import type { reflect } from '../../../vendor/shader-dsl/src/core/reflect.ts';
import type { ReflectedEntry } from '../playground-raster.ts';
import { zeroFor } from '../playground-raster.ts';
import type { PlaygroundCopy } from './contracts.ts';
import { argText, el, fieldLabel, ioRow } from './view-helpers.ts';
export function renderReflection(
  reflectionPane: HTMLElement,
  entries: readonly ReflectedEntry[],
  reflection: ReturnType<typeof reflect> | undefined,
  typedArgs: Map<string, string>,
  copy: PlaygroundCopy,
  onBinding: (name: string) => void,
) {
  const entryGroup = el('div', 'group');
  entryGroup.append(el('p', 'group-title', copy.entryPoints));
  if (entries.length === 0) {
    entryGroup.append(el('p', 'empty', copy.noEntryPoints));
  }
  for (const entry of entries) {
    const box = el('div', 'entry');
    const head = el('div', 'entry-head');
    head.append(el('span', 'stage', `@${entry.stage}`));
    head.append(el('span', 'entry-name', entry.name));
    box.append(head);
    for (const field of entry.io?.inputs ?? []) {
      const { text, attr } = fieldLabel(field);
      box.append(ioRow(copy.inputs, text, attr));
    }
    for (const field of entry.io?.outputs ?? []) {
      const { text, attr } = fieldLabel(field);
      box.append(ioRow(copy.outputs, text, attr));
    }
    // The oracle used to run every entry at the zero of its type, which is how a triangle
    // was only ever seen at its first corner and a shader dividing by a zero input returned
    // NaN for every component. The zeros are the starting values of a form now.
    const inputs = entry.io?.inputs ?? [];
    if (inputs.length > 0) {
      const row = el('div', 'io-row arg-row');
      row.append(el('span', 'io-label', copy.args));
      const fields = el('span', 'io-value');
      inputs.forEach((field, index) => {
        const zero = zeroFor(field.type);
        const name = field.name ?? `arg${index}`;
        const key = `${entry.name}/${name}`;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'arg-input';
        input.dataset.arg = key;
        input.setAttribute('aria-label', `${entry.name} ${name}`);
        input.value = typedArgs.get(key) ?? (zero.ok ? argText(zero.value) : '');
        // A type the form cannot start off, a matrix or a texture among them, is left for
        // the reader to fill in instead of guessed at.
        input.placeholder = field.type ?? '';
        input.addEventListener('input', () => typedArgs.set(key, input.value));
        const label = el('span', 'arg-name', `${name}:`);
        fields.append(label, input);
      });
      row.append(fields);
      box.append(row);
    }

    const returns = ioRow(copy.returns, copy.cpuIdle, '', 'io-value empty');
    returns.dataset.returns = entry.name;
    box.append(returns);
    entryGroup.append(box);
  }
  reflectionPane.append(entryGroup);

  // Resources, and the features the module asks the device for, each only when it has any.
  const resources = reflection
    ? [
        ...reflection.bindGroups.flatMap((group) =>
          (group.entries ?? []).map((entry) => ({
            label: `@group(${group.group ?? 0})`,
            text: `${entry.name}: ${entry.resourceKind}`,
          })),
        ),
        ...reflection.overrides.map((o) => ({ label: 'override', text: String(o.name ?? o) })),
      ]
    : [];
  const resourceGroup = el('div', 'group');
  resourceGroup.append(el('p', 'group-title', copy.resources));
  if (resources.length === 0) resourceGroup.append(el('p', 'empty', copy.noResources));
  else {
    for (const r of resources) {
      const row = ioRow(r.label, r.text);
      // A binding is supplied in the panel under the canvas, so its row here goes there.
      const name = r.text.split(':')[0]!.trim();
      if (r.label !== 'override' && name !== '_fp64') {
        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'to-binding';
        go.textContent = copy.bindings.title;
        go.addEventListener('click', () => onBinding(name));
        row.append(go);
      }
      resourceGroup.append(row);
    }
  }
  reflectionPane.append(resourceGroup);

  const features: readonly string[] = reflection?.requiredFeatures ?? [];
  if (features.length > 0) {
    const featureGroup = el('div', 'group');
    featureGroup.append(el('p', 'group-title', copy.requiredFeatures));
    for (const f of features) featureGroup.append(ioRow('', String(f)));
    reflectionPane.append(featureGroup);
  }
}
