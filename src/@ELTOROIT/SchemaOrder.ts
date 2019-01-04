import { ISchemaData, ISchemaDataParent } from "./Interfaces";
import { OrgManager } from "./OrgManager";
import { LogLevel, Util } from "./Util";
import { DepGraph } from 'dependency-graph';

export class SchemaOrder {
	private orgManager: OrgManager;
	private importOrder: string[] = null;

	constructor(orgManager: OrgManager) {
		this.orgManager = orgManager;
	}

	public findImportOrder(): string[] {
		if (this.importOrder === null) {
			this.removeMetadata();
			this.importOrder = [];

			Util.writeLog(`Finding import order for ${this.getSObjNames().length} objects: ${this.getSObjNames().join(', ')}`, LogLevel.TRACE);
			let graph = new DepGraph({ circular: false });
			this.getSObjNames().forEach( sObjName => {
				graph.addNode(sObjName);
			}); 
			this.getSObjNames().forEach( sObjName => {
				this.orgManager.discovery.getSObjects().get(sObjName).parentsRequired.forEach( parent => {
					graph.addDependency(sObjName, parent);
				});
			}); 
			this.importOrder = graph.overallOrder(false);
		}
		Util.writeLog(`Object import order: ${this.importOrder.join(', ')}`, LogLevel.TRACE);
		return this.importOrder;
	}

	private getSObjNames(): string[] {
		const sObjNamesToLoad: string[] = [];
		this.orgManager.discovery.getSObjects().forEach(
			(sObj: ISchemaData, sObjName: string) => {
				sObjNamesToLoad.push(sObjName);
			},
		);
		return sObjNamesToLoad;
	}

	private findSObjectsWithoutParents(allSObjNames: string[]): string[] {
		const sObjectsFound: string[] = [];

		// Find sObjects without parents
		allSObjNames.forEach(
			(sObjName: string) => {
				if (this.orgManager.discovery.getSObjects().get(sObjName).parentsRequired.length === 0) {
					sObjectsFound.push(sObjName);
				}
			},
		);

		return sObjectsFound;
	}

	private removeMetadata(): void {
		this.orgManager.discovery.getSObjects().forEach(
			(sObj: ISchemaData, sObjName: string) => {
				const parentsRequired: string[] = [];
				sObj.parents.forEach(
					(parent: ISchemaDataParent) => {
						if (this.orgManager.coreMD.isMD(parent.sObj)) {
							// Not required....
						} else {
							parentsRequired.push(parent.sObj);
						}
					},
				);
				sObj.parentsRequired = parentsRequired;
			},
		);
	}

	private removeSObjectFoundFromOthers(sObjectsFound: string[]): void {
		this.orgManager.discovery.getSObjects().forEach(
			(sObj: ISchemaData) => {
				sObj.parentsRequired = sObj.parentsRequired.filter(
					(sObjName: string) => {
						return !sObjectsFound.includes(sObjName);
					},
				);
			},
		);
	}

	private removeSObjectFromChecks(allSObjNames: string[], sObjectsFound: string[]): string[] {
		return allSObjNames.filter(
			(sObjName: string) => {
				return !sObjectsFound.includes(sObjName);
			},
		);
	}

}
