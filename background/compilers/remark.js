md.compilers.remark = (() => {
  var defaults = {
    breaks: false,
    footnotes: false,
    gfm: true,
    sanitize: false,
  }

  var description = {
    breaks: 'Exposes newline characters inside paragraphs as breaks',
    footnotes: 'Toggle reference footnotes and inline footnotes',
    gfm: 'Toggle GFM (GitHub Flavored Markdown)',
    sanitize: 'Disable HTML tag rendering',
  }

  var ctor = ({storage: {state}}) => ({
    defaults,
    description,
    compile: (markdown) => {
      // Remark v15+ API - using unified processor
      const processor = remark.unified()
        .use(remark.remarkParse)
        .use(state.remark.gfm ? remark.remarkGfm : undefined)
        .use(state.remark.breaks ? remark.remarkBreaks : undefined)
        .use(state.remark.footnotes ? remark.remarkFootnotes : undefined)
        .use(remark.remarkSlug)
        .use(remark.remarkFrontmatter, ['yaml', 'toml'])
        .use(remark.remarkHtml, state.remark) // sanitize
      
      return processor.processSync(markdown).toString()
    }
  })

  return Object.assign(ctor, {defaults, description})
})()
