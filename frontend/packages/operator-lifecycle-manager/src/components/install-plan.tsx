import * as React from 'react';
import {
  Alert,
  Button,
  Hint,
  HintTitle,
  HintBody,
  HintFooter,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { sortable } from '@patternfly/react-table';
import classNames from 'classnames';
import { Map as ImmutableMap, Set as ImmutableSet, fromJS } from 'immutable';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom-v5-compat';
import { getUser } from '@console/dynamic-plugin-sdk';
import { Conditions } from '@console/internal/components/conditions';
import {
  MultiListPage,
  DetailsPage,
  Table,
  TableData,
  RowFunctionArgs,
} from '@console/internal/components/factory';
import { errorModal } from '@console/internal/components/modals';
import {
  SectionHeading,
  ConsoleEmptyState,
  ResourceLink,
  ResourceKebab,
  Kebab,
  ResourceIcon,
  navFactory,
  ResourceSummary,
  history,
  useAccessReview,
} from '@console/internal/components/utils';
import { authSvc } from '@console/internal/module/auth';
import {
  apiGroupForReference,
  referenceFor,
  referenceForModel,
  referenceForOwnerRef,
  k8sPatch,
  apiVersionForReference,
  UserInfo,
} from '@console/internal/module/k8s';
import { RootState } from '@console/internal/redux';
import { FLAGS, GreenCheckCircleIcon, Status, useFlag } from '@console/shared';
import PaneBody from '@console/shared/src/components/layout/PaneBody';
import {
  SubscriptionModel,
  ClusterServiceVersionModel,
  InstallPlanModel,
  OperatorGroupModel,
  CatalogSourceModel,
} from '../models';
import { InstallPlanKind, InstallPlanApproval, Step } from '../types';
import { installPlanPreviewModal } from './modals/installplan-preview-modal';
import { requireOperatorGroup } from './operator-group';
import { InstallPlanReview, referenceForStepResource } from './index';

const tableColumnClasses = [
  'pf-v6-c-table__td',
  'pf-v6-c-table__td',
  classNames('pf-m-hidden', 'pf-m-visible-on-sm', 'pf-v6-u-w-16-on-lg', 'pf-v6-c-table__td'),
  classNames('pf-m-hidden', 'pf-m-visible-on-lg', 'pf-v6-c-table__td'),
  classNames('pf-m-hidden', 'pf-m-visible-on-xl', 'pf-v6-c-table__td'),
  Kebab.columnClass,
];

const componentsTableColumnClasses = [
  'pf-v6-c-table__td',
  'pf-v6-c-table__td',
  classNames('pf-m-hidden', 'pf-m-visible-on-sm', 'pf-v6-u-w-16-on-lg', 'pf-v6-c-table__td'),
  classNames('pf-m-hidden', 'pf-m-visible-on-lg', 'pf-v6-c-table__td'),
];

export const InstallPlanHint: React.FC<InstallPlanHintProps> = ({ title, body, footer }) => {
  return (
    <Hint>
      <HintTitle className="pf-v6-u-font-size-md">{title}</HintTitle>
      <HintBody>{body}</HintBody>
      <HintFooter>{footer}</HintFooter>
    </Hint>
  );
};

export const InstallPlanTableRow: React.FC<RowFunctionArgs> = ({ obj }) => {
  const { t } = useTranslation();
  const phaseFor = (phase: InstallPlanKind['status']['phase']) => <Status status={phase} />;
  return (
    <>
      {/* Name */}
      <TableData className={tableColumnClasses[0]}>
        <ResourceLink
          kind={referenceForModel(InstallPlanModel)}
          namespace={obj.metadata.namespace}
          name={obj.metadata.name}
        />
      </TableData>

      {/* Namespace */}
      <TableData className={tableColumnClasses[1]}>
        <ResourceLink kind="Namespace" name={obj.metadata.namespace} />
      </TableData>

      {/* Status */}
      <TableData className={tableColumnClasses[2]}>
        {phaseFor(obj.status?.phase ?? 'Unknown')}
      </TableData>

      {/* Components */}
      <TableData className={tableColumnClasses[3]}>
        <ul className="pf-v6-c-list pf-m-plain">
          {obj.spec.clusterServiceVersionNames.map((csvName) => (
            <li key={csvName}>
              {obj.status?.phase === 'Complete' ? (
                <ResourceLink
                  kind={referenceForModel(ClusterServiceVersionModel)}
                  name={csvName}
                  namespace={obj.metadata.namespace}
                  title={csvName}
                />
              ) : (
                <>
                  <ResourceIcon kind={referenceForModel(ClusterServiceVersionModel)} />
                  {csvName}
                </>
              )}
            </li>
          ))}
        </ul>
      </TableData>

      {/* Subscriptions */}
      <TableData className={tableColumnClasses[4]}>
        {(obj.metadata.ownerReferences || [])
          .filter((ref) => referenceForOwnerRef(ref) === referenceForModel(SubscriptionModel))
          .map((ref) => (
            <ul key={ref.uid} className="pf-v6-c-list pf-m-plain">
              <li>
                <ResourceLink
                  kind={referenceForModel(SubscriptionModel)}
                  name={ref.name}
                  namespace={obj.metadata.namespace}
                  title={ref.uid}
                />
              </li>
            </ul>
          )) || <span className="pf-v6-u-text-color-subtle">{t('olm~None')}</span>}
      </TableData>

      {/* Kebab */}
      <TableData className={tableColumnClasses[5]}>
        <ResourceKebab
          actions={Kebab.factory.common}
          kind={referenceForModel(InstallPlanModel)}
          resource={obj}
        />
      </TableData>
    </>
  );
};

const EmptyMsg: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ConsoleEmptyState title={t('olm~No InstallPlans found')}>
      {t('olm~InstallPlans are created automatically by subscriptions or manually using the CLI.')}
    </ConsoleEmptyState>
  );
};

export const InstallPlansList = requireOperatorGroup((props: InstallPlansListProps) => {
  const { t } = useTranslation();
  const InstallPlanTableHeader = () => {
    return [
      {
        title: t('olm~Name'),
        sortField: 'metadata.name',
        transforms: [sortable],
        props: { className: tableColumnClasses[0] },
      },
      {
        title: t('olm~Namespace'),
        sortField: 'metadata.namespace',
        transforms: [sortable],
        props: { className: tableColumnClasses[1] },
      },
      {
        title: t('olm~Status'),
        sortField: 'status.phase',
        transforms: [sortable],
        props: { className: tableColumnClasses[2] },
      },
      {
        title: t('olm~Components'),
        props: { className: tableColumnClasses[3] },
      },
      {
        title: t('olm~Subscriptions'),
        props: { className: tableColumnClasses[4] },
      },
      {
        title: '',
        props: { className: tableColumnClasses[5] },
      },
    ];
  };

  return (
    <Table
      {...props}
      aria-label={t('olm~InstallPlans')}
      Header={InstallPlanTableHeader}
      Row={InstallPlanTableRow}
      EmptyMsg={EmptyMsg}
    />
  );
});

const getCatalogSources = (
  installPlan: InstallPlanKind,
): { sourceName: string; sourceNamespace: string }[] =>
  _.reduce(
    installPlan?.status?.plan || [],
    (accumulator, { resource: { sourceName, sourceNamespace } }) =>
      accumulator.add(fromJS({ sourceName, sourceNamespace })),
    ImmutableSet(),
  ).toJS();

export const InstallPlansPage: React.FC<InstallPlansPageProps> = (props) => {
  const { t } = useTranslation();
  const params = useParams();
  const namespace = props.namespace || params?.ns;
  return (
    <MultiListPage
      {...props}
      namespace={namespace}
      resources={[
        {
          kind: referenceForModel(InstallPlanModel),
          namespace,
          namespaced: true,
          prop: 'installPlan',
        },
        {
          kind: referenceForModel(OperatorGroupModel),
          namespace,
          namespaced: true,
          prop: 'operatorGroup',
        },
      ]}
      flatten={(resources) => _.get(resources.installPlan, 'data', [])}
      title={t('olm~InstallPlans')}
      showTitle={false}
      ListComponent={InstallPlansList}
    />
  );
};

const updateUser = (isOpenShift: boolean, user: UserInfo): string => {
  if (!isOpenShift) {
    return authSvc.name();
  }
  return user?.username;
};

export const NeedInstallPlanPermissions: React.FC<NeedInstallPlanPermissionsProps> = ({
  installPlan,
}) => {
  const isOpenShift = useFlag(FLAGS.OPENSHIFT);
  const user: UserInfo = useSelector<RootState, object>(getUser);

  const [username, setUsername] = React.useState(updateUser(isOpenShift, user));

  React.useEffect(() => {
    setUsername(updateUser(isOpenShift, user));
  }, [isOpenShift, user]);

  const { t } = useTranslation();

  const apiGroup = apiGroupForReference(referenceFor(installPlan));

  return (
    <Alert
      variant="info"
      isInline
      title={t('olm~Missing sufficient privileges for manual InstallPlan approval')}
    >
      {username
        ? t(
            'olm~User "{{user}}" does not have permissions to patch resource InstallPlans in API group "{{apiGroup}}" in the namespace "{{namespace}}."',
            { user: username, apiGroup, namespace: installPlan.metadata.namespace },
          )
        : t(
            'olm~User does not have permissions to patch resource InstallPlans in API group "{{apiGroup}}" in the namespace "{{namespace}}."',
            { apiGroup, namespace: installPlan.metadata.namespace },
          )}
    </Alert>
  );
};

export const InstallPlanDetails: React.FC<InstallPlanDetailsProps> = ({ obj }) => {
  const { t } = useTranslation();
  const needsApproval =
    obj.spec.approval === InstallPlanApproval.Manual && obj.spec.approved === false;

  const canPatchInstallPlans = useAccessReview({
    group: InstallPlanModel.apiGroup,
    resource: InstallPlanModel.plural,
    namespace: obj.metadata.namespace,
    verb: 'patch',
  });

  return (
    <>
      {needsApproval && canPatchInstallPlans && (
        <PaneBody>
          <InstallPlanHint
            title={t('olm~Review manual InstallPlan')}
            body={t(
              'olm~Inspect the requirements for the components specified in this InstallPlan before approving.',
            )}
            footer={
              <Link
                to={`/k8s/ns/${obj.metadata.namespace}/${referenceForModel(InstallPlanModel)}/${
                  obj.metadata.name
                }/components`}
              >
                <Button variant="primary">{t('olm~Preview InstallPlan')}</Button>
              </Link>
            }
          />
        </PaneBody>
      )}
      {needsApproval && !canPatchInstallPlans && (
        <PaneBody>
          <NeedInstallPlanPermissions installPlan={obj} />
        </PaneBody>
      )}
      <PaneBody>
        <SectionHeading text={t('olm~InstallPlan details')} />
        <div className="row">
          <div className="col-sm-6">
            <ResourceSummary resource={obj} showAnnotations={false} />
          </div>
          <div className="col-sm-6">
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('olm~Status')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Status status={obj.status?.phase ?? t('olm~Unknown')} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('olm~Components')}</DescriptionListTerm>
                {(obj.spec.clusterServiceVersionNames || []).map((csvName) => (
                  <DescriptionListDescription key={csvName}>
                    {obj.status.phase === 'Complete' ? (
                      <ResourceLink
                        kind={referenceForModel(ClusterServiceVersionModel)}
                        name={csvName}
                        namespace={obj.metadata.namespace}
                        title={csvName}
                      />
                    ) : (
                      <>
                        <ResourceIcon kind={referenceForModel(ClusterServiceVersionModel)} />
                        {csvName}
                      </>
                    )}
                  </DescriptionListDescription>
                ))}
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('olm~CatalogSources')}</DescriptionListTerm>
                {getCatalogSources(obj).map(({ sourceName, sourceNamespace }) => (
                  <DescriptionListDescription key={`${sourceNamespace}-${sourceName}`}>
                    <ResourceLink
                      kind={referenceForModel(CatalogSourceModel)}
                      name={sourceName}
                      namespace={sourceNamespace}
                      title={sourceName}
                    />
                  </DescriptionListDescription>
                ))}
              </DescriptionListGroup>
            </DescriptionList>
          </div>
        </div>
      </PaneBody>
      <PaneBody>
        <SectionHeading text={t('olm~Conditions')} />
        <Conditions conditions={obj.status?.conditions} />
      </PaneBody>
    </>
  );
};

export const InstallPlanPreview: React.FC<InstallPlanPreviewProps> = ({
  obj,
  hideApprovalBlock,
}) => {
  const { t } = useTranslation();
  const [needsApproval, setNeedsApproval] = React.useState(
    obj.spec.approval === InstallPlanApproval.Manual && obj.spec.approved === false,
  );
  const subscription = obj?.metadata?.ownerReferences.find(
    (ref) => referenceForOwnerRef(ref) === referenceForModel(SubscriptionModel),
  );

  const plan = obj?.status?.plan || [];
  const stepsByCSV = plan
    .reduce(
      (acc, step) => acc.update(step.resolving, [], (steps) => steps.concat([step])),
      ImmutableMap<string, Step[]>(),
    )
    .toArray();

  const approve = () =>
    k8sPatch(InstallPlanModel, obj, [{ op: 'replace', path: '/spec/approved', value: true }])
      .then(() => setNeedsApproval(false))
      .catch((error) => errorModal({ error: error.toString() }));

  const stepStatus = (status: Step['status']) => (
    <>
      {status === 'Present' && <GreenCheckCircleIcon className="co-icon-space-r" />}
      {status === 'Created' && <GreenCheckCircleIcon className="co-icon-space-r" />}
      {status}
    </>
  );

  const canPatchInstallPlans = useAccessReview({
    group: InstallPlanModel.apiGroup,
    resource: InstallPlanModel.plural,
    namespace: obj.metadata.namespace,
    verb: 'patch',
  });

  return plan.length > 0 ? (
    <>
      {needsApproval && !hideApprovalBlock && !canPatchInstallPlans && (
        <PaneBody>
          <NeedInstallPlanPermissions installPlan={obj} />
        </PaneBody>
      )}
      {needsApproval && !hideApprovalBlock && canPatchInstallPlans && (
        <PaneBody>
          <InstallPlanHint
            title={t('olm~Review manual InstallPlan')}
            body={<InstallPlanReview installPlan={obj} />}
            footer={
              <div className="pf-v6-c-form">
                <div className="pf-v6-c-form__actions">
                  <Button variant="primary" isDisabled={!needsApproval} onClick={() => approve()}>
                    {needsApproval ? t('olm~Approve') : t('olm~Approved')}
                  </Button>
                  <Button
                    variant="secondary"
                    isDisabled={false}
                    onClick={() =>
                      history.push(
                        `/k8s/ns/${obj.metadata.namespace}/${referenceForModel(
                          SubscriptionModel,
                        )}/${subscription.name}?showDelete=true`,
                      )
                    }
                  >
                    {t('olm~Deny')}
                  </Button>
                </div>
              </div>
            }
          />
        </PaneBody>
      )}
      {stepsByCSV.map((steps) => (
        <div key={steps[0].resolving} className="co-m-pane__body">
          <SectionHeading text={steps[0].resolving} />
          <div className="co-table-container">
            <table className="pf-v6-c-table pf-m-compact pf-m-border-rows">
              <thead className="pf-v6-c-table__thead">
                <tr className="pf-v6-c-table__tr">
                  <th className={componentsTableColumnClasses[0]}>{t('olm~Name')}</th>
                  <th className={componentsTableColumnClasses[1]}>{t('olm~Kind')}</th>
                  <th className={componentsTableColumnClasses[2]}>{t('olm~Status')}</th>
                  <th className={componentsTableColumnClasses[3]}>{t('olm~API version')}</th>
                </tr>
              </thead>
              <tbody className="pf-v6-c-table__tbody">
                {steps.map((step) => (
                  <tr
                    key={`${referenceForStepResource(step.resource)}-${step.resource.name}`}
                    className="pf-v6-c-table__tr"
                  >
                    <td className={componentsTableColumnClasses[0]}>
                      {['Present', 'Created'].includes(step.status) ? (
                        <ResourceLink
                          kind={referenceForStepResource(step.resource)}
                          namespace={obj.metadata.namespace}
                          name={step.resource.name}
                          title={step.resource.name}
                        />
                      ) : (
                        <>
                          <ResourceIcon kind={referenceForStepResource(step.resource)} />
                          <Button
                            type="button"
                            onClick={() => installPlanPreviewModal({ stepResource: step.resource })}
                            variant="link"
                          >
                            {step.resource.name}
                          </Button>
                        </>
                      )}
                    </td>
                    <td className={componentsTableColumnClasses[1]}>{step.resource.kind}</td>
                    <td className={componentsTableColumnClasses[2]}>{stepStatus(step.status)}</td>
                    <td className={componentsTableColumnClasses[3]}>
                      {apiVersionForReference(referenceForStepResource(step.resource))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  ) : (
    <PaneBody>
      <ConsoleEmptyState title={t('olm~No components resolved')}>
        {t('olm~This InstallPlan has not been fully resolved yet.')}
      </ConsoleEmptyState>
    </PaneBody>
  );
};

export const InstallPlanDetailsPage: React.FC = (props) => {
  const params = useParams();
  return (
    <DetailsPage
      {...props}
      namespace={params.ns}
      kind={referenceForModel(InstallPlanModel)}
      name={params.name}
      pages={[
        navFactory.details(InstallPlanDetails),
        navFactory.editYaml(),
        // t('olm~Components')
        { href: 'components', nameKey: 'olm~Components', component: InstallPlanPreview },
      ]}
      menuActions={[
        ...Kebab.getExtensionsActionsForKind(InstallPlanModel),
        ...Kebab.factory.common,
      ]}
    />
  );
};

type InstallPlanHintProps = {
  title?: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
};

export type InstallPlansListProps = {};

export type InstallPlansPageProps = {
  namespace?: string;
};

export type InstallPlanDetailsProps = {
  obj: InstallPlanKind;
};

export type InstallPlanPreviewProps = {
  obj: InstallPlanKind;
  hideApprovalBlock?: boolean;
};

export type InstallPlanPreviewState = {
  needsApproval: boolean;
  error?: string;
};

export type NeedInstallPlanPermissionsProps = {
  installPlan: InstallPlanKind;
  user?: UserInfo;
};

InstallPlansPage.displayName = 'InstallPlansPage';
