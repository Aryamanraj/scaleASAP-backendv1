import { Module } from '@nestjs/common';
import { PersonController, PersonProjectController } from './person.controller';
import { PersonService } from './person.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RepoModule, AuthModule],
  controllers: [PersonController, PersonProjectController],
  providers: [PersonService],
  exports: [PersonService],
})
export class PersonModule {}
