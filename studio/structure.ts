import type {StructureResolver} from 'sanity/structure'
import {CaseIcon, StarFilledIcon, ImagesIcon} from '@sanity/icons'

// Studio sidebar: featured and listed projects are split so it's easy to see
// what shows with a photo on the home page and what sits in the list. New
// projects made from the featured list start out featured.
const API_VERSION = '2025-02-19'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('All projects')
        .icon(CaseIcon)
        .child(
          S.documentTypeList('project')
            .title('All projects')
            .defaultOrdering([
              {field: 'order', direction: 'asc'},
              {field: 'year', direction: 'desc'},
            ]),
        ),
      S.listItem()
        .title('Featured projects (with photos)')
        .icon(StarFilledIcon)
        .child(
          S.documentList()
            .title('Featured projects')
            .schemaType('project')
            .filter('_type == "project" && featured == true')
            .apiVersion(API_VERSION)
            .initialValueTemplates([S.initialValueTemplateItem('project-featured')])
            .defaultOrdering([
              {field: 'order', direction: 'asc'},
              {field: 'year', direction: 'desc'},
            ]),
        ),
      S.listItem()
        .title('Listed projects')
        .icon(CaseIcon)
        .child(
          S.documentList()
            .title('Listed projects')
            .schemaType('project')
            .filter('_type == "project" && featured != true')
            .apiVersion(API_VERSION)
            .defaultOrdering([
              {field: 'order', direction: 'asc'},
              {field: 'year', direction: 'desc'},
            ]),
        ),
      S.divider(),
      S.documentTypeListItem('playground').title('Playground').icon(ImagesIcon),
    ])
