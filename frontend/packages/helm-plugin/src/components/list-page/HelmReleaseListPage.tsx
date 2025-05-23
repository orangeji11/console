import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeading } from '@console/shared/src/components/heading/PageHeading';
import HelmReleaseList from './HelmReleaseList';

const HelmReleaseListPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeading title={t('helm-plugin~Helm Releases')} />
      <HelmReleaseList />
    </div>
  );
};

export default HelmReleaseListPage;
