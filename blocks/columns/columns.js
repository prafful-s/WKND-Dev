import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      mute: background ? '1' : '0',
      controls: background ? '0' : '1',
      disablekb: background ? '1' : '0',
      loop: background ? '1' : '0',
      playsinline: background ? '1' : '0',
    };
    suffix = `&${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }

  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function getVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  video.setAttribute('controls', '');
  if (autoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.removeAttribute('controls');
    video.addEventListener('canplay', () => {
      video.muted = true;
      if (autoplay) video.play();
    });
  }

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  sourceEl.setAttribute('type', 'video/mp4');
  video.append(sourceEl);

  return video;
}

const loadVideoEmbed = (block, link, autoplay, background) => {
  const isYoutube = link.includes('youtube') || link.includes('youtu.be');
  if (isYoutube) {
    const url = new URL(link);
    const embedWrapper = embedYoutube(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else {
    const videoEl = getVideoElement(link, autoplay, background);
    block.append(videoEl);
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = true;
    });
  }
};

function isVideoLink(link) {
    try {
        if (!link) return false;
        // Check for regular video files
        const regularVideoCheck = link.match(/\.(mp4|mov|wmv|avi|mkv|webm)$/i) !== null;

        // Check for YouTube URLs
        const youtubeCheck = (
          link.includes('youtube.com') ||
          link.includes('youtu.be') ||
          link.includes('youtube-nocookie.com')
        );

        // Combined check
        const isVideo = regularVideoCheck || youtubeCheck;

        // Log the type of video for debugging
        if (isVideo) {
            console.log('Video type:', {
                isRegularVideo: regularVideoCheck,
                isYouTube: youtubeCheck,
                url: link
            });
        }

        return isVideo;

    } catch (error) {
        console.error('Error checking video link:', error);
        return false;
    }
}

/**
 * Execute dynamic template logic (same as dynamicmedia-template.js)
 * @param {HTMLElement} block
 */
async function executeDynamicTemplateLogic(block) {
  console.log('Executing dynamic template logic for block:', block);

  let inputs = block.querySelectorAll('.dynamicmedia-template > div');
  
  let configSrc = Array.from(block.children)[0]?.textContent?.trim(); //inline or cf

  
  if(configSrc === 'inline'){
    // Get DM Url input
    let templateURL = inputs[1]?.textContent?.trim();
    let variablemapping = inputs[2]?.textContent?.trim();

    if(!templateURL) {
      console.error('Missing mandatory template URL', {
        error: 'Missing template URL',
        stack: new Error().stack
      });
      block.innerHTML = '';
      return;
    }

    // Split by comma first, then handle each parameter pair
    const paramPairs = variablemapping.split(',');
    const paramObject = {};

    if (paramPairs) {
      paramPairs.forEach(pair => {
        const indexOfEqual = pair.indexOf('=');
        if (indexOfEqual !== -1) {
          const key = pair.slice(0, indexOfEqual).trim();
          let value = pair.slice(indexOfEqual + 1).trim();
          
          // Remove trailing comma (if any)
          if (value.endsWith(',')) {
            value = value.slice(0, -1);
          }
          
          // Only add if key is not empty
          if (key) {
            paramObject[key] = value;
          }
        }
      });
    }
    
    // Manually construct the query string (preserving `$` in keys)
    const queryString = Object.entries(paramObject)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

    // Combine with template URL (already includes ? or not)
    let finalUrl = templateURL.includes('?') 
      ? `${templateURL}&${queryString}` 
      : `${templateURL}?${queryString}`;

    console.log("Final URL:", finalUrl);

    if (finalUrl) {
      const finalImg = document.createElement('img');
      Object.assign(finalImg, {
        className: 'dm-template-image',
        src: finalUrl,
        alt: 'dm-template-image',
      });
       // Add error handling for image load failure
       finalImg.onerror = function() {
        console.warn('Failed to load image:', finalUrl);
        // Set fallback image
        this.src = 'https://smartimaging.scene7.com/is/image/DynamicMediaNA/WKND%20Template?wid=2000&hei=2000&qlt=100&fit=constrain'; // Replace with your fallback image path
        this.alt = 'Fallback image - template image not correctly authored';
      };
      block.innerHTML = '';
      block.append(finalImg);
    }
    
  } else if(configSrc === 'cf'){

    //https://author-p153659-e1620914.adobeaemcloud.com/graphql/execute.json/wknd-universal/DynamicMediaTemplateByPath;path=
    const CONFIG = {
      WRAPPER_SERVICE_URL: 'https://prod-31.westus.logic.azure.com:443/workflows/2660b7afa9524acbae379074ae38501e/triggers/manual/paths/invoke',
      WRAPPER_SERVICE_PARAMS: 'api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=kfcQD5S7ovej9RHdGZFVfgvA-eEqNlb6r_ukuByZ64o',
      GRAPHQL_QUERY: '/graphql/execute.json/wknd-universal/DynamicMediaTemplateByPath'
    };
    
    const hostname = getMetadata('hostname');	
    const aemauthorurl = getMetadata('authorurl') || '';
    
    const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '');  
    
    const persistedquery = '/graphql/execute.json/wknd-universal/DynamicMediaTemplateByPath';

    const contentPath = block.querySelector("div.button-container > a")?.textContent?.trim();
    const isAuthor = isAuthorEnvironment();
  
    // Prepare request configuration based on environment
    const requestConfig = isAuthor 
    ? {
        url: `${aemauthorurl}${CONFIG.GRAPHQL_QUERY};path=${contentPath};ts=${Date.now()}`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    : {
        url: `${CONFIG.WRAPPER_SERVICE_URL}?${CONFIG.WRAPPER_SERVICE_PARAMS}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphQLPath: `${aempublishurl}${CONFIG.GRAPHQL_QUERY}`,
          cfPath: contentPath,
          variation: 'master'
        })
      };
  
      try {
        // Fetch data
        const response = await fetch(requestConfig.url, {
          method: requestConfig.method,
          headers: requestConfig.headers,
          ...(requestConfig.body && { body: requestConfig.body })
        });
  
        if (!response.ok) {
          console.error(`error making cf graphql request:${response.status}`, {
            error: 'GraphQL request failed',
            stack: new Error().stack
          });
          block.innerHTML = '';
          return;
        }
  
        const offer = await response.json();
        // Get the template URL and parameter mappings
        const templateURL = offer?.data?.dynamicMediaTemplateByPath?.item?.dm_template;
        const paramPairs = offer?.data?.dynamicMediaTemplateByPath?.item?.var_mapping;

        // Create parameter object
        const paramObject = {};

         // Process each parameter pair
        paramPairs.forEach(pair => {
          const indexOfEqual = pair.indexOf('=');
          const key = pair.slice(0, indexOfEqual).trim();
          let value = pair.slice(indexOfEqual + 1).trim();

          // Remove trailing comma if any
          if (value.endsWith(',')) {
            value = value.slice(0, -1);
          }
          paramObject[key] = value;
        });

        // Construct the query string (preserving `$` in keys)
        const queryString = Object.entries(paramObject)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');

        // Combine with template URL
        let finalUrl = templateURL.includes('?') 
          ? `${templateURL}&${queryString}` 
          : `${templateURL}?${queryString}`;

        console.log("Final URL:", finalUrl);

        // Create and append the image element
        if (finalUrl) {
          const finalImg = document.createElement('img');
          Object.assign(finalImg, {
            className: 'dm-template-image',
            src: finalUrl,
            alt: 'dm-template-image',
          });
          
          // Add error handling for image load failure
          finalImg.onerror = function() {
            console.warn('Failed to load image:', finalUrl);
            // Set fallback image
            this.src = 'https://smartimaging.scene7.com/is/image/DynamicMediaNA/WKND%20Template?wid=2000&hei=2000&qlt=100&fit=constrain'; // Replace with your fallback image path
            this.alt = 'Fallback image - template image not correctly authored';
          };
          
          block.innerHTML = '';
          block.append(finalImg);
        }
      } catch (error) {
        console.error('error rendering content fragment', {
          error: error.message,
          stack: error.stack
        });
        block.innerHTML = '';
      }
  }
}

export default async function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  for (const row of [...block.children]) {
    row.classList.add('columns-row');
    //const firstChild = row.querySelector(':scope > div:first-child');
    for (const col of [...row.children]) {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
     // const videoBlock = col.querySelector('div[data-aue-model="video"]');

      // Check for dynamic template blocks
      const dynamicTemplateBlock = col.querySelector('div[data-aue-model="dm-template"], .dynamicmedia-template');
      if (dynamicTemplateBlock) {
        console.log('Dynamic template block detected in column:', {
          element: dynamicTemplateBlock,
          column: col,
          templateType: dynamicTemplateBlock.getAttribute('data-aue-model') || 'dynamicmedia-template',
          templateLabel: dynamicTemplateBlock.getAttribute('data-aue-label') || 'Unknown'
        });
        
        // Add specific class for dynamic template columns
        const templateWrapper = col.closest('div');
        if (templateWrapper) {
          templateWrapper.classList.add('columns-dynamic-template-col');
        }
        
        // Execute dynamic template logic
        await executeDynamicTemplateLogic(dynamicTemplateBlock);
      }

      const linkavl = col.querySelector('a')?.href;
      const videoBlock = linkavl ? isVideoLink(linkavl) : false;
      
      if (videoBlock) {
        const videoWrapper = col.closest('div');
        if (videoWrapper) {
          // Add video specific classes
          videoWrapper.classList.add('columns-video-col');
          
          // Get video link from button container
          const videoLink = col.querySelector('a');
          if (videoLink) {
            const videoUrl = videoLink.getAttribute('href');
            
            // Create video container
            const videoContainer = document.createElement('div');
            videoContainer.className = 'columns-video-container';
            
            // Load video with appropriate embed
            loadVideoEmbed(
              videoContainer, 
              videoUrl,
              col.dataset.autoplay === 'true',
              col.dataset.background === 'true'
            );

            // Replace button container with video container
            const buttonContainer = videoLink.closest('div');
            if (buttonContainer) {
              buttonContainer.replaceWith(videoContainer);
            }
          }
        }
      }
    }
  }
}