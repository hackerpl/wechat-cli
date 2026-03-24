import { CliUsageError } from './errors.js';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asBinaryFlag(value, fieldName, articleIndex) {
  if (value === undefined) {
    return undefined;
  }

  if (value === 0 || value === 1) {
    return value;
  }

  throw new CliUsageError(`Article ${articleIndex + 1}: \`${fieldName}\` must be 0 or 1.`);
}

function validateCropList(cropList, articleIndex) {
  if (cropList === undefined) {
    return undefined;
  }

  if (!Array.isArray(cropList)) {
    throw new CliUsageError(`Article ${articleIndex + 1}: \`cover_info.crop_percent_list\` must be an array.`);
  }

  return cropList.map((item, cropIndex) => {
    if (!isPlainObject(item)) {
      throw new CliUsageError(`Article ${articleIndex + 1}, crop ${cropIndex + 1}: crop info must be an object.`);
    }

    return {
      ratio: item.ratio,
      x1: item.x1,
      y1: item.y1,
      x2: item.x2,
      y2: item.y2
    };
  });
}

function normalizeNewsArticle(article, articleIndex) {
  if (!article.thumb_media_id) {
    throw new CliUsageError(`Article ${articleIndex + 1}: \`thumb_media_id\` is required when \`article_type\` is \`news\`.`);
  }

  return {
    article_type: 'news',
    title: article.title,
    author: article.author,
    digest: article.digest,
    content: article.content,
    content_source_url: article.content_source_url,
    thumb_media_id: article.thumb_media_id,
    need_open_comment: asBinaryFlag(article.need_open_comment, 'need_open_comment', articleIndex),
    only_fans_can_comment: asBinaryFlag(article.only_fans_can_comment, 'only_fans_can_comment', articleIndex),
    pic_crop_235_1: article.pic_crop_235_1,
    pic_crop_1_1: article.pic_crop_1_1
  };
}

function normalizeNewspicArticle(article, articleIndex) {
  const imageList = article.image_info?.image_list;

  if (!Array.isArray(imageList) || imageList.length === 0) {
    throw new CliUsageError(`Article ${articleIndex + 1}: \`image_info.image_list\` is required when \`article_type\` is \`newspic\`.`);
  }

  if (imageList.length > 20) {
    throw new CliUsageError(`Article ${articleIndex + 1}: \`image_info.image_list\` cannot contain more than 20 images.`);
  }

  return {
    article_type: 'newspic',
    title: article.title,
    content: article.content,
    need_open_comment: asBinaryFlag(article.need_open_comment, 'need_open_comment', articleIndex),
    only_fans_can_comment: asBinaryFlag(article.only_fans_can_comment, 'only_fans_can_comment', articleIndex),
    image_info: {
      image_list: imageList.map((image, imageIndex) => {
        if (!isPlainObject(image) || !image.image_media_id) {
          throw new CliUsageError(`Article ${articleIndex + 1}, image ${imageIndex + 1}: \`image_media_id\` is required.`);
        }

        return {
          image_media_id: image.image_media_id
        };
      })
    },
    cover_info: article.cover_info?.crop_percent_list ? {
      crop_percent_list: validateCropList(article.cover_info.crop_percent_list, articleIndex)
    } : undefined
  };
}

function normalizeArticle(article, articleIndex) {
  if (!isPlainObject(article)) {
    throw new CliUsageError(`Article ${articleIndex + 1} must be an object.`);
  }

  const articleType = article.article_type ?? 'news';

  if (!article.title) {
    throw new CliUsageError(`Article ${articleIndex + 1}: \`title\` is required.`);
  }

  if (!article.content) {
    throw new CliUsageError(`Article ${articleIndex + 1}: \`content\` is required.`);
  }

  if (articleType === 'news') {
    return normalizeNewsArticle(article, articleIndex);
  }

  if (articleType === 'newspic') {
    return normalizeNewspicArticle(article, articleIndex);
  }

  throw new CliUsageError(`Article ${articleIndex + 1}: unsupported \`article_type\` \`${articleType}\`. Use \`news\` or \`newspic\`.`);
}

function extractArticles(input) {
  if (Array.isArray(input)) {
    return input;
  }

  if (isPlainObject(input) && Array.isArray(input.articles)) {
    return input.articles;
  }

  if (isPlainObject(input)) {
    return [input];
  }

  throw new CliUsageError('Draft input must be an article object, an articles array, or an object with an `articles` array.');
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)])
  );
}

function parseBinaryFlagInput(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === '0' || value === 0) {
    return 0;
  }

  if (value === '1' || value === 1) {
    return 1;
  }

  throw new CliUsageError(`\`${fieldName}\` must be 0 or 1.`);
}

function parseCoverCrop(value) {
  const [ratio, x1, y1, x2, y2, ...rest] = value.split(',').map((item) => item.trim());

  if (!ratio || !x1 || !y1 || !x2 || !y2 || rest.length > 0) {
    throw new CliUsageError('`--cover-crop` must use the format `ratio,x1,y1,x2,y2`.');
  }

  return { ratio, x1, y1, x2, y2 };
}

function hasAnyValue(values) {
  return Object.values(values).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined && value !== null && value !== '';
  });
}

export function buildDraftPayloadFromOptions(options) {
  const {
    type = 'news',
    title,
    content,
    author,
    digest,
    contentSourceUrl,
    thumbMediaId,
    needOpenComment,
    onlyFansCanComment,
    picCrop2351,
    picCrop11,
    imageMediaIds = [],
    coverCrops = []
  } = options;

  if (!title) {
    throw new CliUsageError('`--title` is required in parameter mode.');
  }

  if (!content) {
    throw new CliUsageError('`--content` or `--content-file` is required in parameter mode.');
  }

  if (type === 'news') {
    if (imageMediaIds.length > 0 || coverCrops.length > 0) {
      throw new CliUsageError('`--image-media-id` and `--cover-crop` can only be used with `--type newspic`.');
    }

    return normalizeDraftPayload({
      article_type: 'news',
      title,
      author,
      digest,
      content,
      content_source_url: contentSourceUrl,
      thumb_media_id: thumbMediaId,
      need_open_comment: parseBinaryFlagInput(needOpenComment, 'need-open-comment'),
      only_fans_can_comment: parseBinaryFlagInput(onlyFansCanComment, 'only-fans-can-comment'),
      pic_crop_235_1: picCrop2351,
      pic_crop_1_1: picCrop11
    });
  }

  if (type === 'newspic') {
    if (author || digest || contentSourceUrl || thumbMediaId || picCrop2351 || picCrop11) {
      throw new CliUsageError('`newspic` parameter mode does not accept `--author`, `--digest`, `--content-source-url`, `--thumb-media-id`, `--pic-crop-235-1`, or `--pic-crop-1-1`.');
    }

    return normalizeDraftPayload({
      article_type: 'newspic',
      title,
      content,
      need_open_comment: parseBinaryFlagInput(needOpenComment, 'need-open-comment'),
      only_fans_can_comment: parseBinaryFlagInput(onlyFansCanComment, 'only-fans-can-comment'),
      image_info: imageMediaIds.length > 0 ? {
        image_list: imageMediaIds.map((imageMediaId) => ({
          image_media_id: imageMediaId
        }))
      } : undefined,
      cover_info: coverCrops.length > 0 ? {
        crop_percent_list: coverCrops.map(parseCoverCrop)
      } : undefined
    });
  }

  throw new CliUsageError('`--type` must be `news` or `newspic`.');
}

export function hasDraftOptionInput(options) {
  return hasAnyValue(options);
}

export function normalizeDraftPayload(input) {
  const articles = extractArticles(input);

  if (articles.length === 0) {
    throw new CliUsageError('Draft payload must include at least one article.');
  }

  return {
    articles: articles.map((article, index) => stripUndefined(normalizeArticle(article, index)))
  };
}
