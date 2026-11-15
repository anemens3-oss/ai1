// ─────────────────────────────────────────────────────────────
// SITECRAFT Design Document model.
// A project is a structured JSON tree — never a screenshot.
// ─────────────────────────────────────────────────────────────

export type ElementType =
  | 'frame'
  | 'section'
  | 'container'
  | 'text'
  | 'image'
  | 'button'
  | 'rectangle';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElementStyles {
  background: string;
  color: string;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'none' | 'solid' | 'dashed';
  borderRadius: number;
  boxShadow: string;
  opacity: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  display: 'block' | 'flex';
  flexDirection: 'row' | 'column';
  alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  gap: number;
  backgroundImage: string; // url / gradient — empty = none
  backgroundSize: string;
}

export interface ElementTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface ElementContent {
  text: string;      // text / button label
  src: string;       // image source (data-uri / url)
  alt: string;
  href: string;      // button link
  tag: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export interface ResponsiveOverride {
  dimensions?: Partial<Size>;
  styles?: Partial<ElementStyles>;
  typography?: Partial<ElementTypography>;
  hidden?: boolean;
}

export interface DesignElement {
  id: string;
  type: ElementType;
  name: string;
  parentId: string | null;
  children: string[];
  position: Vec2;
  dimensions: Size;
  styles: ElementStyles;
  typography: ElementTypography;
  content: ElementContent;
  responsive: {
    tablet?: ResponsiveOverride;
    mobile?: ResponsiveOverride;
  };
  metadata: {
    locked: boolean;
    hidden: boolean;
    animated?: boolean;
    createdAt: number;
    updatedAt: number;
  };
}

export interface DesignPage {
  id: string;
  name: string;
  rootIds: string[];
  background: string;
}

export interface DesignDocument {
  id: string;
  schemaVersion: 1;
  name: string;
  templateId: string | null;
  pages: DesignPage[];
  elements: Record<string, DesignElement>;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
  elementCount: number;
}

export interface GeneratedSite {
  html: string;
  css: string;
  js: string;
  engine: 'deepseek' | 'local';
  generatedAt: number;
  model?: string;
}

export interface AssistantChange {
  id: string;
  instruction: string;
  targetIds: string[];
  before: Record<string, DesignElement>;
  after: Record<string, DesignElement>;
  summary: string[];
  applied: boolean;
  createdAt: number;
}
