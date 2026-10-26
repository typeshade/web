import { enhanceTabs } from '@typeshade/site-ui/dom/tabs';
for (const group of document.querySelectorAll<HTMLElement>('[data-front-tabs]')) enhanceTabs(group);
