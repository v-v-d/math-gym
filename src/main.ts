import './styles.css';
import { bootstrapAnalytics } from './analytics/policy-bootstrap';
import { AppController } from './app/app-controller';
bootstrapAnalytics();
const root=document.querySelector<HTMLElement>('#app');
if(!root)throw new Error('Missing #app');
new AppController(root);
