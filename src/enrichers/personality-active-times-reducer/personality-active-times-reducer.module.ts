import { Module } from '@nestjs/common';
import { RepoModule } from '../../repo/repo.module';
import { PersonalityActiveTimesReducerHandler } from './handlers/personality-active-times-reducer.handler';
import { PersonalityActiveTimesReducerService } from './services/personality-active-times-reducer.service';

@Module({
  imports: [RepoModule],
  providers: [
    PersonalityActiveTimesReducerHandler,
    PersonalityActiveTimesReducerService,
  ],
  exports: [PersonalityActiveTimesReducerHandler],
})
export class PersonalityActiveTimesReducerModule {}
