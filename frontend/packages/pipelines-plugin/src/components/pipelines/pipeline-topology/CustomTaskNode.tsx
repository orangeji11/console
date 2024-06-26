import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import QuestionCircleIcon from '@patternfly/react-icons/dist/js/icons/question-circle-icon';
import { observer, Node, NodeModel, useHover, createSvgIdUrl } from '@patternfly/react-topology';
import * as cx from 'classnames';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import {
  K8sResourceKind,
  WatchK8sResults,
  getGroupVersionKindForModel,
} from '@console/dynamic-plugin-sdk/src/lib-core';
import { useK8sWatchResources } from '@console/dynamic-plugin-sdk/src/utils/k8s/hooks';
import { resourcePathFromModel, truncateMiddle } from '@console/internal/components/utils';
import { CustomRunModelV1Beta1 } from '@console/pipelines-plugin/src/models';
import { SvgDropShadowFilter } from '@console/topology/src/components/svg';
import { TaskKind, ApprovalStatus, CustomRunKind } from '../../../types';
import { getApprovalStatusColor } from '../../../utils/pipeline-augment';
import { TaskNodeModelData } from './types';

import './CustomTaskNode.scss';

type CustomTaskNodeProps = {
  element: Node<NodeModel, TaskNodeModelData>;
  disableTooltip?: boolean;
};

type WatchResource = {
  [key: string]: K8sResourceKind[] | K8sResourceKind;
};

interface CustomTaskProps {
  pipelineRunName?: string;
  name: string;
  loaded?: boolean;
  task?: {
    data: TaskKind;
  };
  status: string;
  namespace: string;
  disableVisualizationTooltip?: boolean;
  width: number;
  height: number;
  customTask?: K8sResourceKind;
}

const FILTER_ID = 'SvgTaskDropShadowFilterId';

const CustomTaskComponent: React.FC<CustomTaskProps> = ({
  pipelineRunName,
  namespace,
  task,
  status,
  name,
  disableVisualizationTooltip,
  width,
  height,
  customTask,
}) => {
  const { t } = useTranslation();
  const showStatusState: boolean = !!pipelineRunName;
  const visualName = name || _.get(task, ['metadata', 'name'], '');
  const nameRef = React.useRef();
  const pillRef = React.useRef();

  const path = `${resourcePathFromModel(
    CustomRunModelV1Beta1,
    customTask?.metadata?.name,
    namespace,
  )}`;

  const enableLogLink = !!path;
  const taskStatusColor = status
    ? getApprovalStatusColor(status).pftoken.value
    : getApprovalStatusColor(ApprovalStatus.Idle).pftoken.value;

  const [hover, hoverRef] = useHover();
  const truncatedVisualName = React.useMemo(
    () => truncateMiddle(visualName, { length: showStatusState ? 11 : 14, truncateEnd: true }),
    [visualName, showStatusState],
  );

  const renderVisualName = (
    <text
      ref={nameRef}
      x={showStatusState ? 30 : width / 2}
      y={height / 2 + 1}
      className={cx('odc-pipeline-vis-task-text', {
        'is-text-center': !pipelineRunName,
        'is-linked': enableLogLink,
      })}
    >
      {truncatedVisualName}
    </text>
  );

  let taskPill = (
    <g ref={hoverRef}>
      <SvgDropShadowFilter dy={1} id={FILTER_ID} />
      <rect
        filter={hover ? createSvgIdUrl(FILTER_ID) : ''}
        width={width}
        height={height}
        rx={5}
        className={cx('odc-pipeline-vis-task', {
          'is-selected': !!pipelineRunName && hover,
          'is-linked': !!pipelineRunName && enableLogLink,
        })}
        style={{
          stroke: pipelineRunName
            ? status
              ? getApprovalStatusColor(status).pftoken.value
              : getApprovalStatusColor(ApprovalStatus.Idle).pftoken.value
            : '',
        }}
      />
      {visualName !== truncatedVisualName && disableVisualizationTooltip ? (
        <Tooltip triggerRef={nameRef} content={visualName}>
          {renderVisualName}
        </Tooltip>
      ) : (
        renderVisualName
      )}

      {showStatusState && (
        <svg
          width={30}
          height={30}
          viewBox="-10 -7 30 30"
          style={{
            color: taskStatusColor,
          }}
        >
          {<QuestionCircleIcon />}
        </svg>
      )}
    </g>
  );

  if (!disableVisualizationTooltip) {
    taskPill = (
      <Tooltip
        triggerRef={pillRef}
        position="bottom"
        enableFlip={false}
        content={t('pipelines-plugin~Custom Task')}
      >
        <g ref={pillRef}>{taskPill}</g>
      </Tooltip>
    );
  }
  return (
    <g className={cx('odc-pipeline-topology__task-node', { 'is-link': enableLogLink })}>
      {enableLogLink ? <Link to={path}>{taskPill}</Link> : taskPill}
    </g>
  );
};

const CustomTaskNode: React.FC<CustomTaskNodeProps> = ({ element, disableTooltip }) => {
  const { height, width } = element.getBounds();

  const { pipeline, pipelineRun, task } = element.getData();

  const customTaskName = `${pipelineRun?.metadata?.name}-${task?.name}`;
  const customTaskStatus: string = '';

  const watchedResources = {
    customRun: {
      groupVersionKind: getGroupVersionKindForModel(CustomRunModelV1Beta1),
      name: customTaskName,
      namespace: pipeline?.metadata?.namespace,
      prop: 'task',
    },
  };

  const resourcesData: WatchK8sResults<WatchResource> = useK8sWatchResources<WatchResource>(
    watchedResources,
  );

  const taskComponent: JSX.Element = (
    <CustomTaskComponent
      pipelineRunName={pipelineRun?.metadata?.name}
      name={task.name || ''}
      task={task.taskSpec && { data: { spec: task.taskSpec } }}
      namespace={pipeline?.metadata?.namespace}
      status={customTaskStatus}
      disableVisualizationTooltip={disableTooltip}
      width={width}
      height={height}
      customTask={resourcesData.customRun?.data as CustomRunKind}
    />
  );
  return taskComponent;
};

export default React.memo(observer(CustomTaskNode));
