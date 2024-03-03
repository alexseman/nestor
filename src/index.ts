import 'dotenv/config';
import 'module-alias/register';
import App from './app';
import validateEnv from '@/utils/validateEnv';
import GroupController from '@/resources/group/group.controller';
import PersonController from '@/resources/person/person.controller';

validateEnv();
const app = new App(
    [new GroupController(), new PersonController()],
    Number(process.env.PORT)
);
app.listen();
