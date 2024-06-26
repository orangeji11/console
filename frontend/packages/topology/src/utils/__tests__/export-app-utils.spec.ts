import * as k8sResourceModule from '@console/dynamic-plugin-sdk/src/utils/k8s/k8s-resource';
import { mockExportData } from '../../components/export-app/__tests__/export-data';
import { ExportModel } from '../../models/gitops-primer';
import {
  createExportResource,
  getExportAppData,
  getExportResource,
  killExportResource,
} from '../export-app-utils';

describe('export-app-utils', () => {
  it('should create export resource', async () => {
    const spyk8sCreate = jest.spyOn(k8sResourceModule, 'k8sCreate');
    spyk8sCreate.mockReturnValueOnce(Promise.resolve(mockExportData));
    const createResData = getExportAppData('my-export', 'my-app');
    const exportRes = await createExportResource(createResData);
    expect(exportRes).toEqual(mockExportData);
    expect(spyk8sCreate).toHaveBeenCalledTimes(1);
    expect(spyk8sCreate).toHaveBeenCalledWith(ExportModel, createResData);
  });

  it('should get export resource', async () => {
    const spyk8sGet = jest.spyOn(k8sResourceModule, 'k8sGet');
    spyk8sGet.mockReturnValueOnce(Promise.resolve(mockExportData));
    const exportRes = await getExportResource('my-export', 'my-app');
    expect(exportRes).toEqual(mockExportData);
    expect(spyk8sGet).toHaveBeenCalledTimes(1);
    expect(spyk8sGet).toHaveBeenCalledWith(ExportModel, 'my-export', 'my-app');
  });

  it('should kill export resource', async () => {
    const spyk8sKill = jest.spyOn(k8sResourceModule, 'k8sKill');
    spyk8sKill.mockReturnValueOnce(Promise.resolve());
    await killExportResource(mockExportData);
    expect(spyk8sKill).toHaveBeenCalledTimes(1);
    expect(spyk8sKill).toHaveBeenCalledWith(ExportModel, mockExportData);
  });
});
