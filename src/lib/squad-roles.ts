import {InputError} from './validation';

// Event-specific duties are labels, never authentication roles or score rules.
export const squadRoles = [
 'Team Commander',
 'Intel / Radio Officer',
 'Recon Specialist',
 'Technical Analyst',
 'Support Specialist'
] as const;

export function squadRoleValue(value:string){
 if(!value)return null;
 if(!squadRoles.some(role=>role===value))throw new InputError('Choose a valid squad role.');
 return value;
}
