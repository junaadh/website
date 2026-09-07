#let p = json("../src/data/profile.build.json")
#let ink = rgb("293027")
#let muted = rgb("66705f")
#let accent = rgb("496334")
#set document(title: p.fullName + " - Resume", author: p.fullName, keywords: ("Software Developer", "Rust", "Systems", "Full Stack"))
#set page(paper: "a4", margin: (x: 20mm, top: 18mm, bottom: 19mm),
  footer: context [#set text(size: 8pt, fill: muted)
    #line(length: 100%, stroke: 0.5pt + rgb("d4d9ce"))
    #v(5pt)
    #p.fullName #h(1fr) #link(p.website, "junaadh.dev") #h(16pt) #counter(page).display("1 / 1", both: true)
  ])
/* Typst 0.14.2 keys font families off name ID 1, and IBM Plex's static SemiBold
   declares that as "IBM Plex Sans SmBld" (name ID 16 correctly says "IBM Plex
   Sans"/"SemiBold", but that is not what is read). So `weight: 600` finds only
   the Regular face and silently synthesises a bold. Naming the family Typst
   actually registers is what gets the real SemiBold outlines. */
#let semi = "IBM Plex Sans SmBld"
#set text(font: "IBM Plex Sans", size: 10.5pt, fill: ink)
#show strong: it => text(font: semi, it.body)
#set par(leading: 0.65em, spacing: 8pt)
#set list(indent: 11pt, body-indent: 6pt, spacing: 6pt)
#set heading(numbering: none)
#show link: set text(fill: accent)
#show heading.where(level: 1): it => block(above: 22pt, below: 13pt)[
  #text(size: 10pt, font: semi, tracking: 1.3pt, fill: accent, upper(it.body))
]
#let entry(title, subtitle, period, body) = block(breakable: false, above: 0pt, below: 17pt)[
  #grid(columns: (1fr, auto), gutter: 12pt,
    text(size: 13pt, font: semi, title),
    text(size: 9pt, fill: muted, period))
  #if subtitle != "" [#v(3pt) #text(size: 10pt, fill: accent, subtitle)]
  #v(7pt)
  #body
]
#text(size: 34pt, font: semi, tracking: -0.7pt, p.fullName)
#v(6pt)
#text(size: 11pt, fill: accent)[Software Developer / Systems & Full Stack]
#v(15pt)
#text(size: 9pt, fill: muted)[#p.location · #p.phone #linebreak()
#link("mailto:" + p.email, p.email) · #link(p.website, "junaadh.dev") · #link(p.github, "github.com/junaadh")]
#v(15pt)
#p.summary

= Experience
#for job in p.experience {
  entry(job.company, job.role, job.period, [
    #if job.bullets.len() > 0 { list(..job.bullets) } else { text(fill: muted, job.summary) }
  ])
}

= Education
#let education = p.education.first()
#entry(education.institution, education.qualification, education.period, [
  #text(size: 10pt, fill: muted, education.details)
])
#text(size: 9pt, fill: muted)[*Languages* #h(6pt) #p.languages.join(" · ")]

#pagebreak()
#text(size: 10pt, fill: muted)[#p.fullName / Selected work]
#v(7pt)
#text(size: 25pt, font: semi)[Projects & technical toolkit]
#v(10pt)
#text(fill: muted)[Personal projects spanning systems programming, application development, and deployment infrastructure.]

= Selected projects
#for project in p.projects.filter(project => project.cv) {
  entry(project.name, project.tags.join(" / "), "", [
    #list(..project.bullets)
    #v(5pt)
    #text(size: 9pt, link(project.url, project.url.replace("https://", "")))
  ])
}

= Technical toolkit
#grid(columns: (1fr, 1fr), gutter: 20pt, row-gutter: 15pt,
  ..p.skills.map(skill => block(breakable: false)[
    #text(size: 11pt, font: semi, skill.name)
    #v(5pt)
    #text(size: 9.5pt, fill: muted, skill.items.join(" · "))
  ]))
