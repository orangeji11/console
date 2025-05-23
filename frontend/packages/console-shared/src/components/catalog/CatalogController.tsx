import * as React from 'react';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom-v5-compat';
import { ResolvedExtension, CatalogItemType } from '@console/dynamic-plugin-sdk';
import { CatalogItem } from '@console/dynamic-plugin-sdk/src/extensions';
import {
  skeletonCatalog,
  StatusBox,
  removeQueryArgument,
  setQueryArgument,
} from '@console/internal/components/utils';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import { PageHeading } from '@console/shared/src/components/heading/PageHeading';
import { useQueryParams } from '../../hooks';
import PageBody from '../layout/PageBody';
import CatalogView from './catalog-view/CatalogView';
import CatalogTile from './CatalogTile';
import CatalogDetailsModal from './details/CatalogDetailsModal';
import { getURLWithParams, useGetAllDisabledSubCatalogs } from './utils/catalog-utils';
import { determineAvailableFilters } from './utils/filter-utils';
import {
  CatalogCategory,
  CatalogFilters,
  CatalogQueryParams,
  CatalogService,
  CatalogStringMap,
  CatalogType,
  CatalogFilterGroupMap,
} from './utils/types';

type CatalogControllerProps = CatalogService & {
  enableDetailsPanel?: boolean;
  hideSidebar?: boolean;
  title: string;
  description: string | React.ReactElement;
  categories?: CatalogCategory[];
};

const CatalogController: React.FC<CatalogControllerProps> = ({
  type,
  items,
  itemsMap,
  loaded,
  loadError,
  catalogExtensions,
  enableDetailsPanel,
  title: defaultTitle,
  description: defaultDescription,
  hideSidebar,
  categories,
}) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const queryParams = useQueryParams();
  const [disabledSubCatalogs] = useGetAllDisabledSubCatalogs();

  const typeExtension: ResolvedExtension<CatalogItemType> = React.useMemo(
    () => catalogExtensions?.find((extension) => extension.properties.type === type),
    [catalogExtensions, type],
  );

  const title = typeExtension?.properties?.title ?? defaultTitle;
  const getCatalogTypeDescription = () => {
    if (typeof typeExtension?.properties?.catalogDescription === 'string') {
      return typeExtension?.properties?.catalogDescription;
    }
    if (typeof typeExtension?.properties?.catalogDescription === 'function') {
      return typeExtension?.properties?.catalogDescription();
    }
    return defaultDescription;
  };

  const filterGroups: string[] = React.useMemo(() => {
    return typeExtension?.properties.filters?.map((filter) => filter.attribute) ?? [];
  }, [typeExtension]);

  const filterGroupMap: CatalogFilterGroupMap = React.useMemo(() => {
    return (
      typeExtension?.properties.filters?.reduce((map, filter) => {
        map[filter.attribute] = filter;
        return map;
      }, {}) ?? {}
    );
  }, [typeExtension]);

  const groupings: CatalogStringMap = React.useMemo(() => {
    return (
      typeExtension?.properties.groupings?.reduce((map, group) => {
        map[group.attribute] = group.label;
        return map;
      }, {}) ?? {}
    );
  }, [typeExtension]);

  const breadcrumbs = React.useMemo(() => {
    const categoryParam = queryParams.get(CatalogQueryParams.CATEGORY);
    const keywordParam = queryParams.get(CatalogQueryParams.KEYWORD);
    const sortParam = queryParams.get(CatalogQueryParams.SORT_ORDER);
    const params = new URLSearchParams({
      ...(categoryParam ? { [CatalogQueryParams.CATEGORY]: categoryParam } : {}),
      ...(keywordParam ? { [CatalogQueryParams.KEYWORD]: keywordParam } : {}),
      ...(sortParam ? { [CatalogQueryParams.SORT_ORDER]: sortParam } : {}),
    });
    const crumbs = [
      {
        name: t('console-shared~Software Catalog'),
        path: `${pathname}?${params.toString()}`,
      },
    ];

    if (type) {
      crumbs.push({
        name: title,
        path: `${pathname}?${CatalogQueryParams.TYPE}=${type}`,
      });
    }

    return crumbs;
  }, [pathname, queryParams, t, title, type]);

  const selectedItem = React.useMemo(() => {
    const selectedId = queryParams.get(CatalogQueryParams.SELECTED_ID);
    return items.find((it) => selectedId === it.uid);
  }, [items, queryParams]);

  const catalogTypes: CatalogType[] = React.useMemo(() => {
    const types = catalogExtensions
      .map((extension) => ({
        label: extension.properties.title,
        value: extension.properties.type,
        description: extension.properties.typeDescription,
      }))
      .filter((extension) => !disabledSubCatalogs?.includes(extension.value));

    return _.sortBy(types, ({ label }) => label.toLowerCase());
  }, [catalogExtensions, disabledSubCatalogs]);

  const catalogItems = React.useMemo(() => (type ? itemsMap[type] : items), [
    items,
    itemsMap,
    type,
  ]);

  const availableFilters: CatalogFilters = React.useMemo(
    () => determineAvailableFilters({}, catalogItems, filterGroups),
    [catalogItems, filterGroups],
  );

  const openDetailsPanel = React.useCallback((item: CatalogItem): void => {
    setQueryArgument(CatalogQueryParams.SELECTED_ID, item.uid);
  }, []);

  const closeDetailsPanel = React.useCallback((): void => {
    removeQueryArgument(CatalogQueryParams.SELECTED_ID);
  }, []);

  const renderTile = React.useCallback(
    (item: CatalogItem) => (
      <CatalogTile
        item={item}
        catalogTypes={catalogTypes}
        onClick={
          enableDetailsPanel
            ? openDetailsPanel
            : item.cta?.callback
            ? () => item.cta.callback()
            : null
        }
        href={
          !enableDetailsPanel
            ? item.cta?.href
            : getURLWithParams(CatalogQueryParams.SELECTED_ID, item.uid)
        }
      />
    ),
    [catalogTypes, openDetailsPanel, enableDetailsPanel],
  );

  return (
    <>
      <DocumentTitle>{title}</DocumentTitle>
      <PageBody>
        <PageHeading
          title={title}
          breadcrumbs={type ? breadcrumbs : null}
          helpText={getCatalogTypeDescription()}
        />
        <StatusBox
          skeleton={skeletonCatalog}
          data={items}
          loaded={loaded}
          loadError={loadError}
          label={t('console-shared~Catalog items')}
        >
          <CatalogView
            catalogType={type}
            catalogTypes={catalogTypes}
            items={catalogItems}
            categories={categories}
            filters={availableFilters}
            filterGroups={filterGroups}
            filterGroupMap={filterGroupMap}
            groupings={groupings}
            renderTile={renderTile}
            hideSidebar={hideSidebar}
          />
          <CatalogDetailsModal item={selectedItem} onClose={closeDetailsPanel} />
        </StatusBox>
      </PageBody>
    </>
  );
};

export default CatalogController;
