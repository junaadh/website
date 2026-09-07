import { categories, motifs } from "../../shared/config";
import type {
  Education,
  Experience,
  Project,
  Skill,
} from "../../shared/config";
import { Check, ItemList, Select, StringList } from "./fields";
import { Field } from "./ui";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">{children}</div>
);

export function ExperienceEditor({
  items,
  onChange,
}: {
  items: Experience[];
  onChange: (items: Experience[]) => void;
}) {
  return (
    <ItemList
      label="role"
      items={items}
      onChange={onChange}
      title={(job) => job.company}
      subtitle={(job) => `${job.period}${job.current ? " · current" : ""}`}
      create={() => ({
        company: "",
        role: "",
        period: "",
        current: false,
        location: "",
        tags: [],
        summary: "",
        bullets: [],
      })}
    >
      {(job, set) => (
        <>
          <Row>
            <Field
              label="Company"
              value={job.company}
              onChange={(company) => set({ ...job, company })}
            />
            <Field
              label="Role"
              value={job.role}
              onChange={(role) => set({ ...job, role })}
            />
            <Field
              label="Period"
              value={job.period}
              onChange={(period) => set({ ...job, period })}
            />
            <Field
              label="Location"
              value={job.location}
              onChange={(location) => set({ ...job, location })}
            />
          </Row>
          {/* Exactly one role may be current; the validator enforces it too. */}
          <Check
            label="Current role"
            checked={job.current}
            onChange={(current) => set({ ...job, current })}
          />
          <Field
            label="Summary"
            multiline
            value={job.summary}
            onChange={(summary) => set({ ...job, summary })}
          />
          <StringList
            label="Bullets"
            multiline
            addLabel="bullet"
            values={job.bullets}
            onChange={(bullets) => set({ ...job, bullets })}
          />
          <StringList
            label="Tags"
            addLabel="tag"
            values={job.tags}
            onChange={(tags) => set({ ...job, tags })}
          />
        </>
      )}
    </ItemList>
  );
}

export function ProjectEditor({
  items,
  onChange,
}: {
  items: Project[];
  onChange: (items: Project[]) => void;
}) {
  return (
    <ItemList
      label="project"
      items={items}
      onChange={onChange}
      title={(project) => project.name}
      subtitle={(project) => `${project.category}${project.cv ? " · cv" : ""}`}
      create={() => ({
        name: "",
        category: categories[0],
        label: "",
        description: "",
        tags: [],
        url: "https://",
        motif: motifs[0],
        cv: false,
        bullets: [],
      })}
    >
      {(project, set) => (
        <>
          <Row>
            <Field
              label="Name"
              value={project.name}
              onChange={(name) => set({ ...project, name })}
            />
            <Field
              label="Label (eyebrow)"
              value={project.label}
              onChange={(label) => set({ ...project, label })}
            />
            <Select
              label="Category"
              value={project.category}
              options={categories}
              onChange={(category) => set({ ...project, category })}
            />
            <Select
              label="Motif (card graphic)"
              value={project.motif}
              options={motifs}
              onChange={(motif) => set({ ...project, motif })}
            />
          </Row>
          <Field
            label="URL"
            value={project.url}
            onChange={(url) => set({ ...project, url })}
          />
          <Field
            label="Description"
            multiline
            value={project.description}
            onChange={(description) => set({ ...project, description })}
          />
          {/* Only `cv: true` projects reach the PDF. */}
          <Check
            label="Include in the CV"
            checked={project.cv}
            onChange={(cv) => set({ ...project, cv })}
          />
          <StringList
            label="CV bullets"
            multiline
            addLabel="bullet"
            values={project.bullets}
            onChange={(bullets) => set({ ...project, bullets })}
          />
          <StringList
            label="Tags"
            addLabel="tag"
            values={project.tags}
            onChange={(tags) => set({ ...project, tags })}
          />
        </>
      )}
    </ItemList>
  );
}

export function SkillEditor({
  items,
  onChange,
}: {
  items: Skill[];
  onChange: (items: Skill[]) => void;
}) {
  return (
    <ItemList
      label="skill group"
      items={items}
      onChange={onChange}
      title={(skill) => skill.name}
      subtitle={(skill) => `${skill.items.length} items`}
      create={() => ({ name: "", description: "", items: [] })}
    >
      {(skill, set) => (
        <>
          <Field
            label="Name"
            value={skill.name}
            onChange={(name) => set({ ...skill, name })}
          />
          <Field
            label="Description"
            multiline
            value={skill.description}
            onChange={(description) => set({ ...skill, description })}
          />
          <StringList
            label="Items"
            addLabel="item"
            values={skill.items}
            onChange={(entries) => set({ ...skill, items: entries })}
          />
        </>
      )}
    </ItemList>
  );
}

export function EducationEditor({
  items,
  onChange,
}: {
  items: Education[];
  onChange: (items: Education[]) => void;
}) {
  return (
    <ItemList
      label="entry"
      items={items}
      onChange={onChange}
      title={(entry) => entry.institution}
      subtitle={(entry) => entry.period}
      create={() => ({
        institution: "",
        period: "",
        qualification: "",
        details: "",
        location: "",
      })}
    >
      {(entry, set) => (
        <>
          <Row>
            <Field
              label="Institution"
              value={entry.institution}
              onChange={(institution) => set({ ...entry, institution })}
            />
            <Field
              label="Period"
              value={entry.period}
              onChange={(period) => set({ ...entry, period })}
            />
            <Field
              label="Qualification"
              value={entry.qualification}
              onChange={(qualification) => set({ ...entry, qualification })}
            />
            <Field
              label="Location"
              value={entry.location}
              onChange={(location) => set({ ...entry, location })}
            />
          </Row>
          <Field
            label="Details"
            multiline
            value={entry.details}
            onChange={(details) => set({ ...entry, details })}
          />
        </>
      )}
    </ItemList>
  );
}
