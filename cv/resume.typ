#let p = json("../content/profile.json")
#let person = p.person
#let ink = rgb("293027")
#let muted = rgb("66705f")
#let accent = rgb("496334")

// "2026-06" -> "Jun 2026"; a missing end is the current role.
#let months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
#let month(ym) = {
  let (y, m) = ym.split("-")
  months.at(int(m) - 1) + " " + y
}
#let period(start, end) = month(start) + " – " + if end == none { "Present" } else { month(end) }
#let bare(url) = url.replace("https://", "")

#set document(title: person.fullName + " - Resume", author: person.fullName, keywords: ("Software Developer", "Rust", "Systems", "Full Stack"))
#set page(paper: "a4", margin: (x: 20mm, top: 18mm, bottom: 19mm),
  footer: context [#set text(size: 8pt, fill: muted)
    #line(length: 100%, stroke: 0.5pt + rgb("d4d9ce"))
    #v(5pt)
    #person.fullName #h(1fr) #link(p.links.website, bare(p.links.website)) #h(16pt) #counter(page).display("1 / 1", both: true)
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
#let entry(title, subtitle, when, body) = block(breakable: false, above: 0pt, below: 17pt)[
  #grid(columns: (1fr, auto), gutter: 12pt,
    text(size: 13pt, font: semi, title),
    text(size: 9pt, fill: muted, when))
  #if subtitle != "" [#v(3pt) #text(size: 10pt, fill: accent, subtitle)]
  #v(7pt)
  #body
]

#text(size: 34pt, font: semi, tracking: -0.7pt, person.fullName)
#v(6pt)
#text(size: 11pt, fill: accent)[#person.title / Systems & Full Stack]
#v(15pt)
#text(size: 9pt, fill: muted)[#person.location #linebreak()
#link("mailto:" + p.links.email, p.links.email) · #link(p.links.website, bare(p.links.website)) · #link(p.links.github, bare(p.links.github))]
#v(15pt)
#person.intro

= Experience
#for job in p.experience {
  entry(job.company, job.role, period(job.start, job.end), [
    #if job.highlights.len() > 0 { list(..job.highlights) }
    #if job.stack.len() > 0 [#v(2pt) #text(size: 9pt, fill: muted, job.stack.join(" · "))]
  ])
}

= Education
#let education = p.education.first()
#entry(education.institution, education.qualification, period(education.start, education.end), [
  #text(size: 10pt, fill: muted, education.details)
])
#text(size: 9pt, fill: muted)[*Languages* #h(6pt) #person.languages.join(" · ")]

#pagebreak()
#text(size: 10pt, fill: muted)[#person.fullName / Selected work]
#v(7pt)
#text(size: 25pt, font: semi)[Projects & technical toolkit]
#v(10pt)
#text(fill: muted)[Personal projects spanning programming languages, native applications, and deployment infrastructure.]

= Selected projects
#for project in p.projects.filter(project => project.cv) {
  let links = project.links
  let url = links.at("live", default: links.at("repo", default: none))
  entry(project.name, project.kind + " · " + project.stack.join(" / "), str(project.year), [
    #project.description
    #let highlights = project.at("highlights", default: ())
    #if highlights.len() > 0 [#v(2pt) #list(..highlights)]
    #if url != none [#v(5pt) #text(size: 9pt, link(url, bare(url)))]
  ])
}

= Technical toolkit
#grid(columns: (1fr, 1fr), gutter: 20pt, row-gutter: 15pt,
  ..p.skills.map(skill => block(breakable: false)[
    #text(size: 11pt, font: semi, skill.name)
    #v(5pt)
    #text(size: 9.5pt, fill: muted, skill.items.join(" · "))
  ]))
