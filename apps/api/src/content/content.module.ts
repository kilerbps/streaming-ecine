import { Global, Module } from '@nestjs/common';
import { FeedService } from '../feed/feed.service.js';
import { FormsController } from '../forms/forms.controller.js';
import { InteractionsController } from '../interactions/interactions.controller.js';
import { InteractionsService } from '../interactions/interactions.service.js';
import { SearchService } from '../search/search.service.js';
import { MediaUrls } from './content.helpers.js';
import { ContentController } from './content.controller.js';
import { EditorialService } from './editorial.service.js';
import { FilmMapper } from './film.mapper.js';
import { FilmsService } from './films.service.js';
import { HomeService } from './home.service.js';
import { PeopleService } from './people.service.js';
import { SitemapController } from './sitemap.controller.js';

@Global()
@Module({
  controllers: [ContentController, InteractionsController, FormsController, SitemapController],
  providers: [
    MediaUrls,
    FilmMapper,
    FilmsService,
    HomeService,
    PeopleService,
    EditorialService,
    FeedService,
    SearchService,
    InteractionsService,
  ],
  exports: [MediaUrls, FilmMapper, EditorialService],
})
export class ContentModule {}
