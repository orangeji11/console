import * as React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { SortByDirection } from '@patternfly/react-table';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom-v5-compat';
import { StatusBox } from '@console/internal/components/utils';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { SecretModel } from '@console/internal/models';
import { K8sResourceKind } from '@console/internal/module/k8s';
import { isCatalogTypeEnabled, CustomResourceList } from '@console/shared';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import { HELM_CHART_CATALOG_TYPE_ID } from '../../const';
import {
  helmReleasesRowFilters,
  filterHelmReleasesByName,
  filterHelmReleasesByStatus,
  fetchHelmReleases,
} from '../../utils/helm-utils';
import { HelmCatalogIcon } from '../../utils/icons';
import HelmReleaseListHeader from './HelmReleaseListHeader';
import HelmReleaseListRow from './HelmReleaseListRow';

const getRowProps = (obj) => ({
  id: obj.name,
});

const HelmReleaseList: React.FC = () => {
  const { t } = useTranslation();
  const params = useParams();
  const namespace = params.ns;
  const secretsCountRef = React.useRef<number>(0);
  const [releasesLoaded, setReleasesLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<string>();
  const [releases, setReleases] = React.useState([]);
  const secretResource = React.useMemo(
    () => ({
      isList: true,
      namespace,
      kind: SecretModel.kind,
      namespaced: true,
      optional: true,
      selector: {
        matchLabels: { owner: 'helm' },
        matchExpressions: [{ key: 'status', operator: 'NotEquals', values: ['superseded'] }],
      },
      partialMetadata: true,
    }),
    [namespace],
  );
  const [secretsData, secretsLoaded, secretsLoadError] = useK8sWatchResource<K8sResourceKind[]>(
    secretResource,
  );
  const newCount = secretsData?.length ?? 0;

  React.useEffect(() => {
    setReleasesLoaded(false);
    secretsCountRef.current = 0;
  }, [namespace]);

  React.useEffect(() => {
    let destroyed = false;
    if (secretsLoaded && !secretsLoadError) {
      if (newCount === 0) {
        setLoadError(null);
        setReleasesLoaded(true);
        setReleases([]);
      } else if (newCount !== secretsCountRef.current) {
        setReleasesLoaded(false);
        fetchHelmReleases(namespace, true)
          .then((helmReleases) => {
            if (!destroyed) {
              setReleases(helmReleases);
              setReleasesLoaded(true);
              setLoadError(null);
            }
          })
          .catch((err) => {
            if (!destroyed) {
              setReleasesLoaded(true);
              setLoadError(err.message || t('helm-plugin~Unable to load Helm Releases'));
            }
          });
      }
      secretsCountRef.current = newCount;
    }
    return () => {
      destroyed = true;
    };
  }, [namespace, newCount, secretsLoadError, secretsLoaded, t]);

  if (secretsLoadError || loadError) {
    return (
      <StatusBox
        loaded
        loadError={secretsLoadError || loadError}
        label={t('helm-plugin~Helm Releases')}
      />
    );
  }

  const emptyState = () => {
    const isHelmEnabled = isCatalogTypeEnabled(HELM_CHART_CATALOG_TYPE_ID);
    const installURL = {
      pathname: `/catalog/ns/${namespace || 'default'}`,
      search: '?catalogType=HelmChart',
    };
    return (
      <EmptyState
        headingLevel="h3"
        icon={HelmCatalogIcon}
        titleText={<>{t('helm-plugin~No Helm Releases found')}</>}
        variant={EmptyStateVariant.full}
      >
        <EmptyStateFooter>
          {isHelmEnabled ? (
            <EmptyStateActions>
              <Link to={installURL}>
                {t('helm-plugin~Browse the catalog to discover available Helm Charts')}
              </Link>
            </EmptyStateActions>
          ) : null}
        </EmptyStateFooter>
      </EmptyState>
    );
  };

  return (
    <>
      <DocumentTitle>{t('helm-plugin~Helm Releases')}</DocumentTitle>
      <CustomResourceList
        resources={releases}
        loaded={secretsLoaded && releasesLoaded && newCount === secretsCountRef.current}
        EmptyMsg={emptyState}
        queryArg="rowFilter-helm-release-status"
        textFilter="name"
        rowFilters={helmReleasesRowFilters(t)}
        sortBy="name"
        sortOrder={SortByDirection.asc}
        rowFilterReducer={filterHelmReleasesByStatus}
        textFilterReducer={filterHelmReleasesByName}
        ResourceRow={HelmReleaseListRow}
        resourceHeader={HelmReleaseListHeader(t)}
        getRowProps={getRowProps}
      />
    </>
  );
};

export default HelmReleaseList;
