// LaTeX to MathML at build time. A formula on this site is written in LaTeX, `$x^y$` inline
// and `$$…$$` on a line of its own, and reaches the page as MathML Core, which every current
// browser draws itself: the page carries no script and no math font, so a formula keeps
// rendering for as long as browsers draw MathML. Temml does the conversion, at build time only.
// A formula Temml cannot read stops the build with the formula in the message.
import temml from 'temml';

/** One formula as a MathML string. `display` puts it on a line of its own. */
export function renderMath(tex, display = false) {
  try {
    return temml.renderToString(tex, { displayMode: display, throwOnError: true });
  } catch (error) {
    throw new Error(`[math] cannot read the formula ${JSON.stringify(tex)}: ${error.message}`);
  }
}
