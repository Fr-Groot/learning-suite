import mini from "../../schema/examples/mini.project.json" with { type: "json" };
import type { Project } from "../src/types.ts";

/** Copie neuve du mini-projet d'exemple, modifiable par chaque test. */
export const miniProject = (): Project => structuredClone(mini) as Project;
