import { type ComponentType, useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { ImagesTool } from "./tools/ImagesTool";
import { MergeTool } from "./tools/MergeTool";
import { MetadataTool } from "./tools/MetadataTool";
import { NumbersTool } from "./tools/NumbersTool";
import { OrganizeTool } from "./tools/OrganizeTool";
import { PasswordTool } from "./tools/PasswordTool";
import { SplitTool } from "./tools/SplitTool";

interface Tool {
  id: string;
  name: string;
  icon: IconName;
  summary: string;
  Component: ComponentType;
}

const TOOLS: Tool[] = [
  { id: "merge", name: "Merge", icon: "merge", summary: "Combine PDFs into one file, choosing the order and the pages from each.", Component: MergeTool },
  { id: "split", name: "Split", icon: "split", summary: "Cut a PDF into several files, or pull out just the pages you need.", Component: SplitTool },
  { id: "organize", name: "Organize", icon: "organize", summary: "Drag pages into a new order, turn the sideways ones, and drop the rest.", Component: OrganizeTool },
  { id: "images", name: "Images to PDF", icon: "images", summary: "Turn photos and scans into a single PDF, one page per image.", Component: ImagesTool },
  { id: "numbers", name: "Page numbers", icon: "numbers", summary: "Stamp page numbers on every page, in the corner or centre you choose.", Component: NumbersTool },
  { id: "metadata", name: "Metadata", icon: "metadata", summary: "See and change the title, author and software a PDF records, or strip it all.", Component: MetadataTool },
  { id: "password", name: "Password", icon: "password", summary: "Lock a PDF behind a password, or unlock one you have the password for.", Component: PasswordTool },
];

function toolFromHash(): string {
  const id = window.location.hash.slice(1);
  return TOOLS.some((tool) => tool.id === id) ? id : TOOLS[0].id;
}

export function App() {
  const [active, setActive] = useState(toolFromHash);

  useEffect(() => {
    const onHash = () => setActive(toolFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const tool = TOOLS.find((candidate) => candidate.id === active);
    document.title = tool ? `${tool.name} · Quire` : "Quire";
  }, [active]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="5" y="3" width="18" height="24" rx="2" />
            <rect x="10" y="6" width="18" height="23" rx="2" />
          </svg>
          <span className="brand-name">Quire</span>
        </div>
        <nav aria-label="Tools">
          <ul className="tool-nav">
            {TOOLS.map((tool) => (
              <li key={tool.id}>
                <a
                  href={`#${tool.id}`}
                  className="tool-link"
                  aria-current={tool.id === active ? "page" : undefined}
                  onClick={() => setActive(tool.id)}
                >
                  <Icon name={tool.icon} />
                  <span>{tool.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="privacy">
          <Icon name="shield" size={18} />
          <span>
            Everything runs in this tab. Files are never uploaded, and the page is built so it cannot make network
            requests.
          </span>
        </p>
      </aside>

      <main className="workspace">
        {TOOLS.map(({ id, name, summary, Component }) => (
          <section key={id} className="tool" hidden={id !== active} aria-labelledby={`${id}-title`}>
            <header className="tool-header">
              <h1 id={`${id}-title`}>{name}</h1>
              <p>{summary}</p>
            </header>
            <Component />
          </section>
        ))}
      </main>
    </div>
  );
}
