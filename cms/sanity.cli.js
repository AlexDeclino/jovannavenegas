import {defineCliConfig} from 'sanity/cli'
import {PROJECT_ID, DATASET} from './project.js'

export default defineCliConfig({
  api: {projectId: PROJECT_ID, dataset: DATASET},
  studioHost: 'jovannavenegas',
  deployment: {appId: 'z099fnpz3hpvg3mopa87sez2'},
})
