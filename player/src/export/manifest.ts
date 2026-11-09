// Fichier imsmanifest.xml d'un paquet SCORM 1.2 : un seul SCO (le module entier).
import { hasExercises } from "../activities.ts";
import type { Project } from "../types.ts";

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function scorm12Manifest(project: Project, files: string[]): string {
  const id = `LS-${project.meta.id}`;
  const title = xml(project.meta.title);
  // Seuil de réussite transmis au LMS seulement s'il y a des activités notées.
  const mastery = hasExercises(project)
    ? `\n        <adlcp:masteryscore>${Math.round(project.scoring.passingScore)}</adlcp:masteryscore>`
    : "";
  const fileList = [...files, "imsmanifest.xml"]
    .filter((f, i, all) => f !== "imsmanifest.xml" && all.indexOf(f) === i)
    .map((f) => `      <file href="${xml(encodeURI(f))}"/>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${xml(id)}" version="${xml(project.meta.version ?? "1.0.0")}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${title}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>${title}</title>${mastery}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${fileList}
    </resource>
  </resources>
</manifest>
`;
}
