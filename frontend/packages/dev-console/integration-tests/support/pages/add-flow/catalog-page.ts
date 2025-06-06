import { topologyHelper } from '@console/topology/integration-tests/support/pages/topology/topology-helper-page';
import { detailsPage } from '../../../../../integration-tests-cypress/views/details-page';
import {
  addOptions,
  catalogCards,
  catalogTypes,
  devNavigationMenu,
  pageTitle,
} from '../../constants';
import { cardTitle, catalogPO, helmPO } from '../../pageObjects';
import { app, navigateTo } from '../app';
import { addPage } from './add-page';

export const catalogPage = {
  verifyTitle: () => detailsPage.titleShouldContain('Software Catalog'),
  verifyPageTitle: (page: string) => detailsPage.titleShouldContain(page),
  isCheckBoxSelected: (type: string) => cy.get(`input[title="${type}"]`).should('be.checked'),
  isCardsDisplayed: () => {
    app.waitForLoad();
    cy.get(catalogPO.card).should('be.visible');
  },
  search: (keyword: string) => {
    cy.get('.skeleton-catalog--grid').should('not.exist');
    cy.get(catalogPO.search).clear().type(keyword);
  },
  verifyDialog: () => cy.get(catalogPO.sidePane.dialog).should('be.visible'),
  verifyCreateHelmReleasePage: () =>
    cy.get('form h1').eq(0).should('have.text', pageTitle.CreateHelmRelease),
  verifySelectOperatorBackedCard: (cardName: string) => {
    cy.byTestID(`OperatorBackedService-${cardName}`).first().click();
  },
  verifyCreateOperatorBackedPage: (title: string) =>
    detailsPage.titleShouldContain(`Create ${title}`),
  enterOperatorBackedName: (OperatorBackedName: string) =>
    cy.get(catalogPO.operatorBacked.name).clear().type(OperatorBackedName),
  clickButtonOnCatalogPageSidePane: () => {
    catalogPage.verifyDialog();
    cy.get(catalogPO.sidePane.instantiateTemplate).click({ force: true });
  },
  clickOnCancelButton: () => cy.byButtonText('Cancel').click(),
  selectCatalogType: (type: catalogTypes) => {
    switch (type) {
      case catalogTypes.OperatorBacked:
      case 'Operator Backed': {
        cy.get(catalogPO.catalogTypes.operatorBacked).click();
        break;
      }
      case catalogTypes.HelmCharts:
      case 'Helm Charts': {
        cy.get(catalogPO.catalogTypes.helmCharts).click();
        break;
      }
      case catalogTypes.BuilderImage: {
        cy.get(catalogPO.catalogTypes.builderImage).click();
        break;
      }
      case catalogTypes.Template: {
        cy.get(catalogPO.catalogTypes.template).click();
        break;
      }
      case catalogTypes.ServiceClass:
      case 'Service Class': {
        cy.get(catalogPO.catalogTypes.serviceClass).click();
        break;
      }
      case catalogTypes.ManagedServices:
      case 'Managed Services': {
        cy.get(catalogPO.catalogTypes.managedServices).click();
        break;
      }
      case catalogTypes.EventSources:
      case 'Event Sources': {
        cy.get(catalogPO.catalogTypes.eventSources).click();
        break;
      }
      case catalogTypes.EventSinks:
      case 'Event Sinks': {
        cy.get(catalogPO.catalogTypes.eventSinks).click();
        break;
      }
      default: {
        throw new Error('Card is not available in Catalog');
      }
    }
  },
  selectTemplateCategory: (templateCategoryTitle: string) => {
    const selector =
      catalogPO.catalogCategoriesByTitle[
        templateCategoryTitle as keyof typeof catalogPO.catalogCategoriesByTitle
      ];
    if (!selector) {
      throw new Error(`Selector not found for Template category "${templateCategoryTitle}"`);
    }
    cy.get(selector).scrollIntoView();
    cy.get(selector).click();
    cy.log(`Select Template category ${templateCategoryTitle}`);
  },
  selectKnativeServingCard: () =>
    cy.get(cardTitle, { timeout: 40000 }).contains('Knative Serving').click(),
  selectHelmChartCard: (cardName: string) => cy.byTestID(`HelmChart-${cardName}`).first().click(),
  clickOnInstallButton: () => {
    cy.get(catalogPO.installHelmChart.create).click();
    cy.get('.co-m-loader', { timeout: 40000 }).should('not.exist');
  },
  enterReleaseName: (releaseName: string) =>
    cy.get(catalogPO.installHelmChart.releaseName).clear().type(releaseName),
  selectCardInCatalog: (card: catalogCards | string) => {
    cy.get('.skeleton-catalog--grid').should('not.exist');
    cy.byLegacyTestID('perspective-switcher-toggle').click();
    switch (card) {
      case catalogCards.mariaDB || 'MariaDB': {
        cy.get(catalogPO.cards.mariaDBTemplate).first().click();
        break;
      }
      case catalogCards.cakePhp || 'CakePHP + MySQL': {
        cy.get(catalogPO.cards.phpCakeTemplate).first().click();
        break;
      }
      case catalogCards.nodeJs || 'Node.js': {
        cy.get(catalogPO.cards.nodeJsBuilderImage).first().click();
        break;
      }
      case catalogCards.nodeJsPostgreSQL: {
        cy.get(catalogPO.cards.nodejsPostgreSQL).first().click();
        break;
      }
      case catalogCards.apacheHTTPServer: {
        cy.get(catalogPO.cards.apacheHTTPServer).first().click();
        break;
      }
      case catalogCards.nginxHTTPServer: {
        cy.get(catalogPO.cards.nginxHTTPServer).first().click();
        break;
      }
      case catalogCards.knativeKafka: {
        cy.get(catalogPO.cards.knativeKafka).first().click();
        break;
      }
      case catalogCards.jenkins: {
        cy.get(catalogPO.cards.jenkinsTemplate).first().click();
        break;
      }
      case 'Nodejs': {
        cy.get(catalogPO.cards.helmNodejs).first().click();
        break;
      }
      default: {
        throw new Error(`${card} card is not available in Catalog`);
      }
    }
  },
  verifyCardName: (partialCardName: string) => {
    cy.get(cardTitle).contains(partialCardName, { matchCase: false });
  },
  verifyChartListAvailable: () => {
    cy.get(catalogPO.cardList)
      .should('exist')
      .find(catalogPO.cardHeader)
      .its('length')
      .should('be.greaterThan', 0);
  },
  verifyHelmChartCardsAvailable: () => {
    cy.get(catalogPO.cardList)
      .should('exist')
      .find(catalogPO.cardHeader)
      .each(($el) => {
        expect('Helm Charts').toContain($el.text());
      });
  },
  verifyChartRepoAvailable: (helmRepo: string) => {
    const repo = helmRepo
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .trim();
    cy.get(catalogPO.chartRepositoryGroup).within(() => {
      cy.get(`[data-test="chartRepositoryTitle${repo}"]`).should('be.visible');
    });
  },
  verifyChartRepoNotAvailable: (helmRepo: string) => {
    const repo = helmRepo
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .trim();
    cy.get(catalogPO.chartRepositoryGroup).within(() => {
      cy.get(`[data-test="chartRepositoryTitle${repo}"]`).should('not.exist');
    });
  },
  verifyFilterByKeywordField: () => {
    cy.get('[data-test="search-catalog"] input').should('be.visible');
  },
  verifySortDropdown: () => {
    cy.get(catalogPO.aToz).should('be.visible');
    cy.get(catalogPO.zToA).should('be.visible');
  },
  createHelmChart: (releaseName: string, helmChartName: string) => {
    navigateTo(devNavigationMenu.Add);
    app.waitForDocumentLoad();
    addPage.verifyCard('Helm Chart');
    addPage.selectCardFromOptions(addOptions.HelmChart);
    detailsPage.titleShouldContain(pageTitle.HelmCharts);
    catalogPage.isCardsDisplayed();
    catalogPage.search(helmChartName);
    catalogPage.selectHelmChartCard(helmChartName);
    catalogPage.verifyDialog();
    catalogPage.clickButtonOnCatalogPageSidePane();
    catalogPage.verifyCreateHelmReleasePage();
    catalogPage.enterReleaseName(releaseName);
    catalogPage.clickOnInstallButton();
    app.waitForDocumentLoad();
    topologyHelper.verifyWorkloadInTopologyPage(releaseName);
  },
  verifyCategories: () => {
    const categories = ['All items', 'CI/CD', 'Databases', 'Languages', 'Middleware', 'Other'];
    cy.get('ul.vertical-tabs-pf.restrict-tabs li.vertical-tabs-pf-tab.shown >a').each(($el) => {
      expect(categories).toContain($el.text());
    });
  },
  verifyTypes: (category: string) => {
    cy.get(`[data-test="tab ${category}"]`);
  },
  verifyCardTypeOfAllCards: (cardType: string) => {
    cy.get(catalogPO.card).each(($card) => {
      expect($card.find(catalogPO.cardBadge).text()).toContain(cardType);
    });
  },
};

export const catalogInstallPageObj = {
  selectHelmChartVersion: (version: string) => cy.dropdownSwitchTo(version),
  verifyChartVersionDropdownAvailable: () => cy.isDropdownVisible(),
  selectChangeOfChartVersionDialog: (option: string) => {
    if (option === 'Proceed') {
      cy.get('#confirm-action').click();
    } else {
      cy.byLegacyTestID('modal-cancel-action').click();
    }
  },
  selectHelmChartCard: (cardName: string) => cy.dropdownSwitchTo(cardName),
};

export const sidePaneObj = {
  verifyChartVersion: () => cy.get(helmPO.sidePane.chartVersion).eq(0).should('have.text', '0.2.1'),
};
