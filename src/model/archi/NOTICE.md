# relationships.xml

Archi's relationship validity matrix: for every source and target element type, the relationship types ArchiMate 3.2 allows between them (the specification's Appendix B). It is the data behind `src/model/validity.ts`, vendored unmodified (#129).

- **Source:** Archi 5.10.0, plugin `com.archimatetool.model_5.10.0.202609030941`, path `model/relationships.xml`. The same file is in [archimatetool/archi](https://github.com/archimatetool/archi) at `com.archimatetool.model/model/relationships.xml`.
- **SHA-256:** `82cc8d11b174f3edf700fc8d6e3e061d4d9d8e65e5ec0f3c323d94f98a2681e7`. `validity.test.ts` checks it, so the file cannot be edited by hand without the test saying so. To take a newer Archi's matrix, copy the file again and update the hash here and in the test.
- **Letters:** `relationships-keys.xml` in the same plugin maps them. `a` Access, `c` Composition, `f` Flow, `g` Aggregation, `i` Assignment, `n` Influence, `o` Association, `r` Realization, `s` Specialization, `t` Triggering, `v` Serving. An upper-case letter would mark a derived relationship; this version has none.
- **License:** MIT, as below. The text is the plugin's own `LICENSE.txt`.

---

Copyright (c) 2013-2026 Phillip Beauvoir, Jean-Baptiste Sarrodie, The Open Group

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
