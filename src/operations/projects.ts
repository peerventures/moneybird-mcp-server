import { z } from 'zod';
import { getClient } from '../services/client.js';

export const GetProjectSchema = z.object({
  id: z.string().describe('The ID of the project to retrieve'),
});

export const ListProjectsSchema = z.object({
  page: z.number().int().positive().optional().describe('Page number (starts from 1)'),
  perPage: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
  state: z.enum(['active', 'archived', 'all']).optional().describe('Filter by project state'),
});

export const CreateProjectSchema = z.object({
  name: z.string().describe('Name of the project'),
  contact_id: z.string().optional().describe('Associated contact ID'),
  budget: z.number().optional().describe('Budget for the project'),
  note: z.string().optional().describe('Notes about the project'),
  state: z.enum(['active', 'archived']).optional().describe('State of the project'),
});

export const UpdateProjectSchema = GetProjectSchema.extend({
  ...CreateProjectSchema.shape,
});

export async function getProject(id: string) {
  const client = getClient();
  const projects = await client.getProjects();
  const project = projects.find((project: any) => project.id === id);
  
  if (!project) {
    throw new Error(`Project with ID ${id} not found`);
  }
  
  return project;
}

export async function listProjects(options?: z.infer<typeof ListProjectsSchema>) {
  const client = getClient();
  const projects = await client.getProjects();
  
  // Filter by state if provided
  let filteredProjects = projects;
  if (options?.state && options.state !== 'all') {
    filteredProjects = projects.filter((project: any) => project.state === options.state);
  }
  
  // Basic pagination if requested
  if (options?.page && options?.perPage) {
    const startIndex = (options.page - 1) * options.perPage;
    const endIndex = startIndex + options.perPage;
    return {
      projects: filteredProjects.slice(startIndex, endIndex),
      page: options.page,
      perPage: options.perPage,
      totalCount: filteredProjects.length,
      totalPages: Math.ceil(filteredProjects.length / options.perPage)
    };
  }
  
  return { projects: filteredProjects };
}

export async function createProject(projectData: z.infer<typeof CreateProjectSchema>) {
  const client = getClient();
  return await client.request('post', 'projects', { project: projectData });
}

export async function updateProject(id: string, projectData: Partial<z.infer<typeof CreateProjectSchema>>) {
  const client = getClient();
  return await client.request('put', `projects/${id}`, { project: projectData });
}

export async function archiveProject(id: string) {
  const client = getClient();
  return await client.request('put', `projects/${id}`, { project: { state: 'archived' } });
} 