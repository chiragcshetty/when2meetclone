<template>
  <SignIn v-show="!usernameExist" />
  <div class="event-details">
    <div class="information">
      <h1>{{ eventName }}</h1>
      <div class="date-chooser">
        <div
          class="left"
          @click="page !== 0 && page--"
          :class="page === 0 ? 'unactive' : ''"
        >
          <i class="fas fa-angle-left"></i>
        </div>
        <p>{{ eventRange }}</p>
        <div
          class="right"
          @click="page !== pageNumbers && page++"
          :class="page === pageNumbers ? 'unactive' : ''"
        >
          <i class="fas fa-angle-right"></i>
        </div>
      </div>
      <div class="timezone-chooser">
        <label for="viewer-tz">Timezone</label>
        <select id="viewer-tz" v-model="viewerTimezone">
          <option v-for="tz in timezones" :key="tz" :value="tz">
            {{ tz }}
          </option>
        </select>
      </div>
    </div>

    <button @click="clearAll" class="drop-shadow">
      <i class="fas fa-eraser"></i>
    </button>
  </div>

  <div class="content">
    <Calendar :userName="userName" :page="page" />
    <div class="right-information">
      <Participants />
      <EventDetails />
    </div>
  </div>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import Participants from "../components/Participants";
import EventDetails from "../components/EventDetails";
import SignIn from "../components/SignIn.vue";
import { useStore } from "vuex";
import { computed, ref } from "vue";
import { getTimezoneOptions } from "../utils";
import { MutationType } from "../store/mutations";

export default {
  emits: ["signIn"],
  components: {
    Calendar,
    Participants,
    EventDetails,
    SignIn,
  },
  setup() {
    const store = useStore();
    const clearAll = () => {
      store.dispatch("REMOVE_SELF_AVAILABILITY");
    };

    const page = ref(0);

    // Each participant can independently choose the timezone the grid is
    // rendered in; it is stored in vuex and defaults to their local timezone.
    const viewerTimezone = computed({
      get: () => store.state.viewerTimezone,
      set: (tz) => store.commit(MutationType.setViewerTimezone, tz),
    });

    return {
      clearAll,
      page,
      viewerTimezone,
      timezones: getTimezoneOptions(),
      eventRange: computed(() => store.getters.getTopLabel),
      userName: computed(() => store.state.userName),
      pageNumbers: computed(() => store.getters.getPageNumbers),
      eventName: computed(() => store.getters.getEventName),
      usernameExist: computed(() => store.getters.usernameExist),
    };
  },
};
</script>

<style lang="scss" scoped>
@import "../styles.scss";

.unactive {
  opacity: 0.4;
  cursor: not-allowed !important;
}
.event-details {
  margin-top: 20px;
  margin-bottom: 10px;
  margin-left: 70px;
  display: flex;
  width: 570px;
  align-items: center;
  justify-content: space-between;
  overflow: show;
  .information {
    display: flex;
    align-items: baseline;
    h1 {
      text-transform: uppercase;
      font-size: 2rem;
      margin-right: 40px;
    }
    .date-chooser {
      display: flex;
      align-items: center;
      color: rgb(99, 99, 99);
      p {
        padding: 0 20px;
        font-size: 1.6rem;
      }
      .left,
      .right {
        cursor: pointer;
        font-size: 2rem;
      }
    }
    .timezone-chooser {
      display: flex;
      flex-direction: column;
      margin-left: 30px;
      color: rgb(99, 99, 99);
      label {
        font-size: 0.7rem;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
      select {
        padding: 4px 6px;
        border-radius: 8px;
        border: solid 1px rgb(214, 214, 214);
        color: rgb(99, 99, 99);
        font-family: "Poppins", sans-serif;
        cursor: pointer;
        &:focus {
          outline: none;
        }
      }
    }
  }

  button {
    padding: 0.5rem 1rem;
    border-radius: 10px;
    border: 0;
    background-color: white;
    color: rgb(99, 99, 99);
    font-size: 1.4rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: 0.1s ease-in-out;
  }
}
.content {
  display: flex;
  justify-content: start;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-active {
  opacity: 0;
}
</style>
